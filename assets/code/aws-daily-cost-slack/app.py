"""Post the previous day's estimated AWS costs to Slack."""

import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from unicodedata import east_asian_width
from urllib.request import Request, urlopen
from xml.etree import ElementTree

JST = timezone(timedelta(hours=9))
ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
SERVICE_NAMES = {
    "Amazon Virtual Private Cloud": "Amazon VPC",
    "AWS Secrets Manager": "Secrets Manager",
}


def yen(amount, rate):
    return int((amount * rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def format_amount(amount, rate):
    value = f"${amount:.2f}"
    return f"{value} (約{yen(amount, rate):,}円)" if rate else value


def display_width(value):
    return sum(2 if east_asian_width(char) in ("F", "W") else 1 for char in value)


def format_breakdown(items, rate):
    rows = [(SERVICE_NAMES.get(name, name), f"${amount:.2f}",
             f"{yen(amount, rate):,}円" if rate else "-") for name, amount in items]
    name_width = max([display_width("サービス"), *(display_width(row[0]) for row in rows)])
    usd_width = max([display_width("利用料"), *(display_width(row[1]) for row in rows)])
    def row(name, usd, jpy):
        return (name + " " * (name_width - display_width(name) + 2)
                + usd + " " * (usd_width - display_width(usd) + 2) + jpy)
    return "\n".join(["```", row("サービス", "利用料", "日本円"),
                      *(row(*values) for values in rows), "```"])


def get_monthly_rate(ssm, month):
    name = f"{os.environ['FX_PARAMETER_PREFIX'].rstrip('/')}/{month}"
    try:
        saved = json.loads(ssm.get_parameter(Name=name)["Parameter"]["Value"])
        return Decimal(saved["rate"]), saved["date"]
    except Exception as error:
        if getattr(error, "response", {}).get("Error", {}).get("Code") != "ParameterNotFound":
            raise

    with urlopen(ECB_URL, timeout=8) as response:
        root = ElementTree.parse(response).getroot()
    quotes = {}
    quote_date = None
    for element in root.iter():
        if "time" in element.attrib:
            quote_date = element.attrib["time"]
        if element.attrib.get("currency") in ("USD", "JPY"):
            quotes[element.attrib["currency"]] = Decimal(element.attrib["rate"])
    if not quote_date or len(quotes) != 2:
        raise ValueError("ECB reference rates are incomplete")
    rate = quotes["JPY"] / quotes["USD"]
    ssm.put_parameter(
        Name=name,
        Value=json.dumps({"rate": str(rate), "date": quote_date}),
        Type="String",
        Overwrite=False,
    )
    return rate, quote_date


def get_costs(ce, first_day, today):
    request = {
        "TimePeriod": {"Start": first_day.isoformat(), "End": today.isoformat()},
        "Granularity": "DAILY",
        "Metrics": ["UnblendedCost"],
        "GroupBy": [{"Type": "DIMENSION", "Key": "SERVICE"}],
    }
    days = {}
    while True:
        response = ce.get_cost_and_usage(**request)
        for day in response["ResultsByTime"]:
            date = day["TimePeriod"]["Start"]
            record = days.setdefault(date, {"services": {}, "estimated": False})
            record["estimated"] |= day.get("Estimated", False)
            for group in day["Groups"]:
                name = group["Keys"][0]
                amount = Decimal(group["Metrics"]["UnblendedCost"]["Amount"])
                record["services"][name] = record["services"].get(name, Decimal(0)) + amount
        token = response.get("NextPageToken")
        if not token:
            return days
        request["NextPageToken"] = token


def summarize(today, days):
    yesterday = today - timedelta(days=1)
    month_start = yesterday.replace(day=1)
    previous = days.get(yesterday.isoformat(), {"services": {}, "estimated": True})
    services = previous["services"]
    daily = sum(services.values(), Decimal(0))
    monthly = sum(
        (sum(day["services"].values(), Decimal(0)) for key, day in days.items()
         if month_start.isoformat() <= key <= yesterday.isoformat()),
        Decimal(0),
    )
    ranked = sorted(services.items(), key=lambda item: item[1], reverse=True)
    shown = [(name, amount) for name, amount in ranked if amount > 0][:5]
    remainder = daily - sum((amount for _, amount in shown), Decimal(0))
    if remainder > 0:
        shown.append(("その他", remainder))
    return yesterday, month_start, daily, monthly, shown


def rate_line(yesterday, rate, rate_date):
    if rate:
        return f"※USD = {rate:.2f}円（{yesterday:%Y年%m月}の固定レート／基準日: {rate_date}）"
    return "為替レートを取得できなかったため円換算なし"


def format_message(today, days, rate=None, rate_date=None):
    yesterday, month_start, daily, monthly, shown = summarize(today, days)
    lines = [
        "📊 *AWS利用料（日次・概算）*", "", "",
        f"📅 {yesterday:%Y/%m/%d}", f"`{format_amount(daily, rate)}`",
        "", "", "📋 内訳",
    ]
    lines.append(format_breakdown(shown, rate) if shown else "料金データなし（反映待ちの可能性があります）")
    lines.extend([
        "", "", f"💰 今月累計 {month_start:%Y/%m/%d}〜{yesterday:%m/%d}",
        f"`{format_amount(monthly, rate)}`", rate_line(yesterday, rate, rate_date),
    ])
    return "\n".join(lines)


def format_payload(today, days, rate=None, rate_date=None):
    yesterday, month_start, daily, monthly, shown = summarize(today, days)
    intro = ("📊 *AWS利用料（日次・概算）*\n\n\n"
             f"📅 {yesterday:%Y/%m/%d}\n`{format_amount(daily, rate)}`\n\n\n📋 内訳")
    footer = (f"💰 今月累計 {month_start:%Y/%m/%d}〜{yesterday:%m/%d}\n"
              f"`{format_amount(monthly, rate)}`\n{rate_line(yesterday, rate, rate_date)}")
    blocks = [{"type": "section", "text": {"type": "mrkdwn", "text": intro}}]
    if shown:
        rows = [["サービス", "利用料", "日本円"]]
        rows.extend([SERVICE_NAMES.get(name, name), f"${amount:.2f}",
                     f"{yen(amount, rate):,}円" if rate else "-"] for name, amount in shown)
        blocks.append({
            "type": "table",
            "column_settings": [{"align": "left"}] * 3,
            "rows": [[{"type": "raw_text", "text": cell} for cell in row] for row in rows],
        })
    else:
        blocks.append({"type": "section", "text": {"type": "mrkdwn",
                                                  "text": "料金データなし（反映待ちの可能性があります）"}})
    blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": "\n\n" + footer}})
    return {"text": format_message(today, days, rate, rate_date), "blocks": blocks}


def lambda_handler(_event, _context):
    import boto3
    from botocore.exceptions import ClientError

    today = datetime.now(JST).date()
    yesterday = today - timedelta(days=1)
    days = get_costs(boto3.client("ce", region_name="us-east-1"), yesterday.replace(day=1), today)
    ssm = boto3.client("ssm")
    try:
        rate, rate_date = get_monthly_rate(ssm, yesterday.strftime("%Y-%m"))
    except (OSError, ValueError, ClientError) as error:
        print(f"Reference rate unavailable: {type(error).__name__}")
        rate, rate_date = None, None
    payload = format_payload(today, days, rate, rate_date)
    webhook = ssm.get_parameter(Name=os.environ["WEBHOOK_PARAMETER_NAME"], WithDecryption=True)["Parameter"]["Value"]
    request = Request(webhook, data=json.dumps(payload).encode("utf-8"),
                      headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(request, timeout=10) as response:
        if response.status != 200:
            raise RuntimeError(f"Slack returned HTTP {response.status}")
    return {"status": "sent", "date": yesterday.isoformat()}
