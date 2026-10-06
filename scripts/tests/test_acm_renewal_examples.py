"""Offline tests only: AWS clients, system commands and TLS connections are mocked."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock, patch, call
from datetime import datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/code/acm-renewal"


class ClientError(Exception):
    def __init__(self, code):
        self.response = {"Error": {"Code": code}}


def load(name):
    spec = importlib.util.spec_from_file_location(name, SOURCE / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    stubs = {"boto3": types.SimpleNamespace(client=Mock()),
             "botocore": types.ModuleType("botocore"),
             "botocore.config": types.SimpleNamespace(Config=lambda **kw: kw),
             "botocore.exceptions": types.SimpleNamespace(ClientError=ClientError)}
    with patch.dict(sys.modules, stubs):
        spec.loader.exec_module(module)
    return module


class LambdaTests(unittest.TestCase):
    def setUp(self):
        self.mod = load("lambda_function")
        self.arn = "arn:aws:acm:ap-northeast-1:111122223333:certificate/test"
        self.event = {"source": "aws.acm", "detail-type": "ACM Certificate Available",
                      "resources": [self.arn], "account": "111122223333",
                      "region": "ap-northeast-1",
                      "detail": {"Action": "RENEWAL", "CertificateType": "AMAZON_ISSUED"}}
        self.env = patch.dict(os.environ, {"CERTIFICATE_ARN": self.arn,
                              "INSTANCE_ID": "i-example", "SSM_DOCUMENT_NAME": "DeployAcmCertificate",
                              "SSM_DOCUMENT_VERSION": "1"})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.ctx = Mock(get_remaining_time_in_millis=lambda: 600000)
        self.ssm = self.mod.boto3.client.return_value
        self.ssm.send_command.return_value = {"Command": {"CommandId": "test-id"}}

    def test_invalid_event_does_not_call_aws(self):
        for field, value in [("account", "other"), ("region", "other"), ("resources", []),
                             ("source", "other"), ("detail", {"Action": "ISSUANCE"})]:
            self.assertEqual(self.mod.lambda_handler({**self.event, field: value}, self.ctx),
                             {"status": "ignored"})
        self.mod.boto3.client.assert_not_called()

    def test_success_fixed_target_no_secrets(self):
        self.ssm.get_command_invocation.return_value = {"Status": "Success", "ResponseCode": 0}
        self.assertEqual(self.mod.lambda_handler(self.event, self.ctx)["status"], "verified-on-host")
        args = self.ssm.send_command.call_args.kwargs
        self.assertEqual(args["Parameters"], {})
        self.assertEqual(args["InstanceIds"], ["i-example"])
        self.assertEqual(args["DocumentVersion"], "1")

    def test_eventual_consistency_and_pending(self):
        self.ssm.get_command_invocation.side_effect = [ClientError("InvocationDoesNotExist"),
            {"Status": "InProgress"}, {"Status": "Success", "ResponseCode": 0}]
        with patch.object(self.mod.time, "sleep"):
            self.assertEqual(self.mod.lambda_handler(self.event, self.ctx)["status"], "verified-on-host")

    def test_failure_and_nonzero_code(self):
        for status, code in [("Failed", 1), ("TimedOut", -1), ("Cancelled", -1), ("Success", 1)]:
            self.ssm.get_command_invocation.return_value = {"Status": status, "ResponseCode": code}
            with self.assertRaises(RuntimeError):
                self.mod.lambda_handler(self.event, self.ctx)

    def test_observer_deadline_does_not_claim_success(self):
        with patch.object(self.mod.time, "monotonic", side_effect=[0, 441]):
            with self.assertRaisesRegex(RuntimeError, "Result not confirmed"):
                self.mod.lambda_handler(self.event, self.ctx)

    def test_short_lambda_timeout_rejected(self):
        self.ctx.get_remaining_time_in_millis = lambda: 10000
        with self.assertRaises(RuntimeError):
            self.mod.lambda_handler(self.event, self.ctx)
        self.mod.boto3.client.assert_not_called()


class HostTests(unittest.TestCase):
    def setUp(self):
        self.mod = load("deploy_certificate")

    def material(self, expired=False, other_key=False):
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "zexample.com")])
        now = datetime.now(timezone.utc)
        cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
                .public_key(key.public_key()).serial_number(x509.random_serial_number())
                .not_valid_before(now - timedelta(days=3))
                .not_valid_after(now + timedelta(days=-1 if expired else 30))
                .sign(key, hashes.SHA256()))
        if other_key:
            key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        return cert.public_bytes(serialization.Encoding.PEM), key.private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
            serialization.BestAvailableEncryption(b"test-only-passphrase"))

    def test_material_writes_verified_key_and_invokes_openssl(self):
        cert, key = self.material()
        with tempfile.TemporaryDirectory() as temp, patch.object(self.mod, "run") as run:
            directory = Path(temp)
            self.mod.validate_material(cert, cert, key, b"test-only-passphrase", directory, "zexample.com")
            self.assertEqual(self.mod.fingerprint(cert), self.mod.fingerprint((directory / "fullchain.pem").read_bytes()))
            serialization.load_pem_private_key((directory / "private.key").read_bytes(), password=None)
            args = run.call_args.args[0]
            self.assertIn("-verify_hostname", args)
            self.assertNotIn("test-only-passphrase", " ".join(args))

    def test_expired_and_wrong_key_rejected_before_activation(self):
        for options in [{"expired": True}, {"other_key": True}]:
            cert, key = self.material(**options)
            with tempfile.TemporaryDirectory() as temp, patch.object(self.mod, "run") as run:
                with self.assertRaises(RuntimeError):
                    self.mod.validate_material(cert, cert, key, b"test-only-passphrase", Path(temp), "zexample.com")
                run.assert_not_called()

    def test_activate_success(self):
        with patch.object(self.mod, "switch_current") as switch, patch.object(self.mod, "run"), patch.object(self.mod, "wait_for_certificate") as verify:
            self.mod.activate("new", "old", ["nginx", "-t"], "nginx", "zexample.com", "new-fp", "old-fp")
            switch.assert_called_once_with("new")
            verify.assert_called_once_with("zexample.com", "new-fp")

    def test_reload_error_restores_previous_generation(self):
        with patch.object(self.mod, "switch_current") as switch, patch.object(self.mod, "run", side_effect=[None, None, RuntimeError("reload"), None, None]), patch.object(self.mod, "wait_for_certificate") as verify:
            with self.assertRaisesRegex(RuntimeError, "previous certificate restored"):
                self.mod.activate("new", "old", ["nginx", "-t"], "nginx", "zexample.com", "new-fp", "old-fp")
            self.assertEqual(switch.call_args_list, [call("new"), call("old")])
            verify.assert_called_once_with("zexample.com", "old-fp")

    def test_rollback_error_is_not_reported_as_restored(self):
        with patch.object(self.mod, "switch_current"), patch.object(self.mod, "run", side_effect=RuntimeError("failure")):
            with self.assertRaisesRegex(RuntimeError, "manual recovery required"):
                self.mod.activate("new", "old", [], "nginx", "zexample.com", "new", "old")

    def test_invalid_initial_state_does_not_call_aws(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(self.mod, "BASE", Path(temp)):
            with self.assertRaisesRegex(RuntimeError, "Initialize current"):
                self.mod.deploy({"web_server": "nginx"})
        self.mod.boto3.client.assert_not_called()

    def test_json_and_python_sources_parse(self):
        for path in SOURCE.glob("*.json"):
            json.loads(path.read_text(encoding="utf-8"))
        for path in SOURCE.glob("*.py"):
            compile(path.read_text(encoding="utf-8"), str(path), "exec")


if __name__ == "__main__":
    unittest.main()
