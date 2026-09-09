import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(scriptDir);
const tutorialRoot = path.join(root, "tutorials");
const checkOnly = process.argv.includes("--check");
const seriesTitle = "マルチVPC・閉域VDI基盤案件";
const pages = [
  ["workspaces-skill-transfer.html", "全体構築・運用順序"],
  ["workspaces-managed-ad.html", "AWS Managed Microsoft AD 構築・管理"],
  ["workspaces-management-ec2.html", "管理用EC2・Active Directory管理"],
  ["workspaces-ad-connector.html", "AD Connector 構築・権限委任"],
  ["workspaces-provisioning-gpo.html", "Amazon WorkSpaces 構築・OU・GPO"],
  ["workspaces-image-bundle.html", "WorkSpaces カスタムイメージ・バンドル"],
  ["workspaces-patch-manager.html", "Systems Manager Patch Manager"],
  ["workspaces-cost-optimizer.html", "Amazon WorkSpaces Cost Optimizer"],
  ["workspaces-cloudwatch-monitoring.html", "CloudWatch・SNS 監視／通知"],
];
const pageMeta = new Map([
  ["workspaces-skill-transfer.html", [seriesTitle, "AWS Managed Microsoft AD、AD Connector、Amazon WorkSpaces、OU・GPO、カスタムイメージ、Systems Manager、Cost Optimizerを依存関係に沿って再構築する<br>実機検証で確認した設定値、工程ゲート、証跡画像および運用上の判断基準をまとめる"]],
  ["workspaces-managed-ad.html", ["AWS Managed Microsoft AD 構築・管理", "2つのAvailability Zoneへ配置するAWS Managed Microsoft ADの構成と作成手順をまとめる<br>ディレクトリ作成後のユーザー、グループ、パスワードおよび可用性確認まで整理する"]],
  ["workspaces-management-ec2.html", ["管理用EC2・Active Directory管理", "AWS Managed Microsoft ADを管理するWindows Server EC2を起動し、Systems Manager経由で接続する<br>ドメイン参加、ADUC、GPMCおよびDefault Domain Policyの確認まで整理する"]],
  ["workspaces-ad-connector.html", ["AD Connector 構築・権限委任", "AD Connector専用サービスアカウントと最小権限の委任を準備する<br>VPCピアリング、往復ルート、DC用Security GroupおよびAD Connector作成を依存順にまとめる"]],
  ["workspaces-provisioning-gpo.html", ["Amazon WorkSpaces 構築・OU・GPO", "AD ConnectorをWorkSpacesへ登録し、パイロットWorkSpaceを作成する<br>ターゲットOU、権限委任、WSP管理テンプレート、GPOの作成・適用確認まで整理する"]],
  ["workspaces-image-bundle.html", ["WorkSpaces カスタムイメージ・バンドル", "Image Checkerの合格後にカスタムイメージとバンドルを作成し、検証用WorkSpaceで確認する<br>別AWSアカウントへの共有・コピー・再作成と、RDPを使用する場合の制約をまとめる"]],
  ["workspaces-patch-manager.html", ["Systems Manager Patch Manager", "Windows ServerをSystems Managerのマネージドノードとして登録する<br>Maintenance Window、Patch Group、Scan・Install、S3ログおよび適用後確認まで実機証跡で整理する"]],
  ["workspaces-cost-optimizer.html", ["Amazon WorkSpaces Cost Optimizer", "Amazon WorkSpaces Cost Optimizer v2.9.10をCloudFormationでデプロイし、課金モードの評価と変更結果を確認する<br>DryRun、料金しきい値、実行時刻、ECSタスク、CloudWatch Logs、S3レポートおよびダッシュボードの確認方法を整理する"]],
  ["workspaces-cloudwatch-monitoring.html", ["CloudWatch・SNS 監視／通知", "Amazon EC2、Windows OSおよびAmazon WorkSpacesのメトリクスをCloudWatchへ集約する<br>SNS通知、アラーム、ダッシュボードおよび監視動作の確認手順を整理する"]],
]);

const stripTags = (value) => value
  .replace(/<[^>]+>/g, "")
  .replaceAll("&amp;", "&")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .trim();

const protectCodeBlocks = (html) => {
  const blocks = [];
  const text = html.replace(/<pre><code(?:\s[^>]*)?>[\s\S]*?<\/code><\/pre>/g, (block) => {
    const token = `@@WORKSPACES_CODE_BLOCK_${blocks.length}@@`;
    blocks.push(block);
    return token;
  });
  return { text, restore: (value) => blocks.reduce((result, block, index) => result.replace(`@@WORKSPACES_CODE_BLOCK_${index}@@`, block), value) };
};

const classifyInlineCode = (html) => {
  const protectedCode = protectCodeBlocks(html);
  let result = protectedCode.text.replace(/<(p|li|td)([^>]*)>([\s\S]*?)<\/\1>/g, (all, tag, attrs, inner) => {
    const formatted = inner.replace(/<code(?: class="(?:ui-value|inline-code)")?>([\s\S]*?)<\/code>/g, (code, value, offset) => {
      if (/^&lt;[A-Z][A-Z0-9_]*&gt;$/.test(value.trim())) return `<code>${value}</code>`;
      const before = stripTags(inner.slice(Math.max(0, offset - 45), offset));
      const after = stripTags(inner.slice(offset + code.length, offset + code.length + 55));
      const uiContext = /(?:画面|コンソール|タブ|メニュー|項目|ボタン|欄|フィールド)[^。]{0,30}$/.test(before)
        || /^(?:を|へ|に)?(?:選択|クリック|押下|入力|開く|有効化|無効化|オン|オフ)/.test(after);
      return `<code class="${uiContext ? "ui-value" : "inline-code"}">${value}</code>`;
    });
    return `<${tag}${attrs}>${formatted}</${tag}>`;
  });
  result = result.replace(/<code(?: class="(?:ui-value|inline-code)")?>([\s\S]*?)<\/code>/g, (_code, value) => {
    if (/^&lt;[A-Z][A-Z0-9_]*&gt;$/.test(value.trim())) return `<code>${value}</code>`;
    return `<code class="inline-code">${value}</code>`;
  });
  return protectedCode.restore(result);
};

const buildSectionLinks = (html) => {
  if (html.includes('class="section-links"')) return html;
  const links = [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)]
    .slice(0, 10)
    .map((match) => `        <a href="#${match[1]}">${stripTags(match[2]).replace(/^\d+[.．]\s*/, "")}</a>`);
  if (!links.length) return html;
  const nav = `      <nav class="section-links" aria-label="主要セクション">\n${links.join("\n")}\n      </nav>\n`;
  return html.replace(/(<div class="page-summary">[\s\S]*?<\/div>\s*)/, `$1${nav}`);
};

const buildRelatedPages = (index) => {
  const links = [];
  if (index > 0) links.push(pages[index - 1]);
  if (index !== 0) links.push(pages[0]);
  if (index < pages.length - 1) links.push(pages[index + 1]);
  return `      <h2 id="related-pages">関連ページ</h2>\n      <div class="page-link-grid">\n${links.map(([file, label]) => `        <a class="page-link-card" href="${file}"><strong>${label}</strong><span>${seriesTitle}の関連手順</span></a>`).join("\n")}\n      </div>\n`;
};

const transform = (source, index) => {
  const [file] = pages[index];
  const [pageTitle, pageLead] = pageMeta.get(file);
  let html = source;
  if (index === 0) {
    html = html
      .replace(/<title>Amazon WorkSpaces 技術移管 \| Documentation<\/title>/, `<title>${seriesTitle} | Documentation</title>`)
      .replace(/<h1>Amazon WorkSpaces 技術移管<\/h1>/, `<h1>${seriesTitle}</h1>`)
      .replace(
        /<meta name="description" content="AWS Managed Microsoft ADからAmazon WorkSpaces、カスタムイメージ、Patch Manager、Cost Optimizerまでを再構築できる技術移管資料">/,
        '<meta name="description" content="複数VPCへ分離した閉域VDI基盤の構築順序と、Managed Microsoft AD、AD Connector、Amazon WorkSpacesの運用手順">',
      );
  }
  html = html.replace(
    /^[ \t]*<nav class="breadcrumb" aria-label="Breadcrumb">[\s\S]*?<\/nav>/m,
    '      <nav class="breadcrumb" aria-label="Breadcrumb">\n        <a href="../"><span class="nav-icon" aria-hidden="true">⌂</span>Home</a>\n        <span>トピック</span>\n      </nav>',
  );
  if (!/<h1>/.test(html)) {
    html = html.replace(/(<nav class="breadcrumb" aria-label="Breadcrumb">[\s\S]*?<\/nav>)/, `$1\n      <h1>${pageTitle}</h1>`);
  }
  if (!html.includes('class="page-summary"')) {
    if (/<p class="lead">/.test(html)) {
      html = html.replace(/<p class="lead">([\s\S]*?)<\/p>/, '<div class="page-summary"><strong>⚡ このページの要約</strong><p class="lead">$1</p></div>');
    } else {
      html = html.replace(/(<h1>[\s\S]*?<\/h1>)/, `$1\n      <div class="page-summary"><strong>⚡ このページの要約</strong><p class="lead">${pageLead}</p></div>`);
    }
  }
  html = html.replace(/<div class="code" data-prompt="\$"><div class="code-header"><span>PowerShell<\/span>/gi, '<div class="code"><div class="code-header"><span>PowerShell</span>');
  html = html.replace(/<ol(?![^>]*\bclass=)>/g, '<ol class="step-list">');
  html = html.replace(/<ul class="contains-task-list">/g, '<ul class="check-list">');
  html = html.replace(/<ul(?![^>]*\bclass=)>([\s\S]*?)<\/ul>/g, (all, inner) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)];
    const checks = items.filter((item) => /確認|記録|完了|一致|取得|保存|成功|正常/.test(stripTags(item[1]))).length;
    return items.length > 0 && checks >= Math.ceil(items.length / 2) ? `<ul class="check-list">${inner}</ul>` : all;
  });
  html = html.replace(/<table(?![^>]*\bclass=)>(\s*<thead>[\s\S]*?<\/thead>)/g, (all, head) => /パラメータ|必須/.test(stripTags(head)) ? `<table class="parameter-table">${head}` : all);
  html = classifyInlineCode(html);
  html = buildSectionLinks(html);
  if (!html.includes('id="related-pages"') && index > 0) html = html.replace(/\s*<\/main>/, `\n${buildRelatedPages(index)}    </main>`);
  return html.replace(/\r?\n/g, "\r\n");
};

const errors = [];
for (let index = 0; index < pages.length; index += 1) {
  const [file] = pages[index];
  const filePath = path.join(tutorialRoot, file);
  const source = fs.readFileSync(filePath, "utf8");
  const output = transform(source, index);
  if (checkOnly && output !== source) errors.push(`${file}: template formatting is out of sync`);
  if (!checkOnly && output !== source) fs.writeFileSync(filePath, output, "utf8");
  const finalHtml = checkOnly ? source : output;
  for (const [pattern, message] of [
    [/<div class="page-summary">/, "page summary missing"],
    [/<h1>/, "page title missing"],
    [/class="section-links"/, "section links missing"],
    [/<pre><code/, "code markup missing"],
  ]) {
    if (!pattern.test(finalHtml) && !(message === "code markup missing" && !source.includes("<pre><code"))) errors.push(`${file}: ${message}`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log(`${checkOnly ? "Checked" : "Formatted"} ${pages.length} WorkSpaces pages`);
