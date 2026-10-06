"""Example: one allowed certificate -> one EC2, with execution-result checking.

Handler: lambda_function.lambda_handler. Lambda timeout: 600 seconds.
No certificate, private key or passphrase is sent to Run Command.
"""
import os
import time

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


def lambda_handler(event, context):
    certificate_arn = os.environ["CERTIFICATE_ARN"]
    instance_id = os.environ["INSTANCE_ID"]
    document_name = os.environ["SSM_DOCUMENT_NAME"]
    document_version = os.environ["SSM_DOCUMENT_VERSION"]
    arn_parts = certificate_arn.split(":", 5)
    detail = event.get("detail", {})
    if not (
        event.get("source") == "aws.acm"
        and event.get("detail-type") == "ACM Certificate Available"
        and event.get("resources") == [certificate_arn]
        and event.get("account") == arn_parts[4]
        and event.get("region") == arn_parts[3]
        and detail.get("Action") == "RENEWAL"
        and detail.get("CertificateType") == "AMAZON_ISSUED"
    ):
        return {"status": "ignored"}

    if context.get_remaining_time_in_millis() < 540_000:
        raise RuntimeError("Configure the Lambda timeout to 600 seconds")

    ssm = boto3.client(
        "ssm", region_name=arn_parts[3],
        config=Config(connect_timeout=5, read_timeout=10,
                      retries={"mode": "standard", "total_max_attempts": 2}),
    )
    result = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName=document_name,
        DocumentVersion=document_version,
        Parameters={},  # Fixed document + root-owned host config, no secrets
        TimeoutSeconds=60,
        Comment="ACM renewal: deploy the configured certificate",
    )
    command_id = result["Command"]["CommandId"]
    print({"command_id": command_id, "status": "submitted"})
    deadline = time.monotonic() + 440
    while time.monotonic() < deadline:
        try:
            invocation = ssm.get_command_invocation(
                CommandId=command_id, InstanceId=instance_id,
            )
        except ClientError as error:
            if error.response["Error"]["Code"] != "InvocationDoesNotExist":
                raise
        else:
            status = invocation["Status"]
            if status == "Success":
                if invocation.get("ResponseCode") != 0:
                    raise RuntimeError(f"Unexpected response code: {command_id}")
                print({"command_id": command_id, "status": "verified-on-host"})
                return {"status": "verified-on-host", "command_id": command_id}
            if status in {"Failed", "Cancelled", "TimedOut"}:
                # Deliberately do not print command stdout/stderr or API payloads
                raise RuntimeError(f"Run Command {status}: {command_id}")
        time.sleep(5)

    # A timed-out observer must not claim the host operation has been cancelled
    raise RuntimeError(f"Result not confirmed; inspect Run Command: {command_id}")
