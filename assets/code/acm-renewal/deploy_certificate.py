"""Linux/root example. Requires boto3 and cryptography>=42, OpenSSL, systemd.

Initialize /etc/pki/tls/acm-zexample/current with a working certificate first.
The web server must reference current/fullchain.pem and current/private.key.
"""
import hashlib
import json
import os
from pathlib import Path
import socket
import ssl
import stat
import subprocess
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone

import boto3
from botocore.config import Config
from cryptography import x509
from cryptography.hazmat.primitives import serialization

BASE = Path("/etc/pki/tls/acm-zexample")
CONFIG = Path("/etc/acm-renewal.json")
SERVERS = {
    "nginx": (["/usr/sbin/nginx", "-t"], "nginx"),
    "httpd": (["/usr/sbin/httpd", "-t"], "httpd"),
}


def run(arguments):
    # No shell, no inherited verbose logging, no secret in process arguments
    subprocess.run(arguments, check=True, stdout=subprocess.PIPE,
                   stderr=subprocess.PIPE, timeout=15)


def private_root_path(path, directory=False):
    info = path.lstat()
    correct_type = stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode)
    if not correct_type or info.st_uid != 0 or info.st_mode & 0o077:
        raise RuntimeError("Expected a root-owned private file/directory")


def write_file(path, contents):
    # Parent is a new, root-only version directory
    with path.open("xb") as handle:
        os.chmod(path, 0o600)
        handle.write(contents)
        handle.flush()
        os.fsync(handle.fileno())


def fingerprint(pem):
    der = x509.load_pem_x509_certificate(pem).public_bytes(serialization.Encoding.DER)
    return hashlib.sha256(der).hexdigest()


def validate_material(cert_pem, chain_pem, encrypted_key, passphrase, directory, hostname):
    cert = x509.load_pem_x509_certificate(cert_pem)
    now = datetime.now(timezone.utc)
    if not cert.not_valid_before_utc <= now < cert.not_valid_after_utc - timedelta(days=1):
        raise RuntimeError("Certificate is not currently usable")
    key = serialization.load_pem_private_key(encrypted_key, password=passphrase)
    public_format = serialization.PublicFormat.SubjectPublicKeyInfo
    cert_public = cert.public_key().public_bytes(serialization.Encoding.DER, public_format)
    key_public = key.public_key().public_bytes(serialization.Encoding.DER, public_format)
    if cert_public != key_public:
        raise RuntimeError("Certificate/key mismatch")
    write_file(directory / "certificate.pem", cert_pem)
    write_file(directory / "chain.pem", chain_pem)
    write_file(directory / "fullchain.pem", cert_pem.rstrip() + b"\n" + chain_pem)
    write_file(directory / "private.key", key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ))
    run(["/usr/bin/openssl", "verify", "-purpose", "sslserver",
         "-verify_hostname", hostname, "-untrusted", str(directory / "chain.pem"),
         str(directory / "certificate.pem")])


def served_fingerprint(hostname):
    # Verifies the CA chain and hostname using SNI, without disabling TLS checks
    context = ssl.create_default_context()
    with socket.create_connection(("127.0.0.1", 443), timeout=5) as raw:
        with context.wrap_socket(raw, server_hostname=hostname) as connection:
            return hashlib.sha256(connection.getpeercert(binary_form=True)).hexdigest()


def wait_for_certificate(hostname, expected):
    for _ in range(6):
        try:
            if served_fingerprint(hostname) == expected:
                return
        except (OSError, ssl.SSLError):
            pass
        time.sleep(2)
    raise RuntimeError("Served certificate verification failed")


def switch_current(target):
    temporary = BASE / (".next-" + uuid.uuid4().hex)
    try:
        temporary.symlink_to(target)
        os.replace(temporary, BASE / "current")
    finally:
        temporary.unlink(missing_ok=True)


def activate(candidate, previous, test_command, service, hostname, new_fp, old_fp):
    try:
        switch_current(candidate)
        # Restore inherited SELinux labels before the service reads the files
        run(["/usr/sbin/restorecon", "-R", str(BASE)])
        run(test_command)
        run(["/usr/bin/systemctl", "reload", service])
        wait_for_certificate(hostname, new_fp)
    except Exception:
        try:
            switch_current(previous)
            run(test_command)
            run(["/usr/bin/systemctl", "reload", service])
            wait_for_certificate(hostname, old_fp)
        except Exception:
            raise RuntimeError("Rollback not verified; manual recovery required") from None
        raise RuntimeError("Deployment failed; previous certificate restored") from None


def deploy(config):
    test_command, service = SERVERS[config["web_server"]]
    current = BASE / "current"
    if not current.is_symlink():
        raise RuntimeError("Initialize current with a working certificate first")
    previous = current.resolve(strict=True)
    if previous.parent != (BASE / "versions").resolve(strict=True):
        raise RuntimeError("Unexpected current target")
    private_root_path(previous, directory=True)
    old_fp = fingerprint((previous / "fullchain.pem").read_bytes())
    # Refuse automatic replacement if the existing endpoint is already unhealthy
    if served_fingerprint(config["hostname"]) != old_fp:
        raise RuntimeError("Current files and running endpoint do not match")

    sdk_config = Config(connect_timeout=5, read_timeout=10,
                        retries={"mode": "standard", "total_max_attempts": 2})
    acm = boto3.client("acm", region_name=config["region"], config=sdk_config)
    secrets = boto3.client("secretsmanager", region_name=config["region"], config=sdk_config)
    secret = secrets.get_secret_value(SecretId=config["secret_arn"])
    passphrase = json.loads(secret["SecretString"])["passphrase"].encode("utf-8")
    exported = acm.export_certificate(CertificateArn=config["certificate_arn"], Passphrase=passphrase)
    cert_pem = exported["Certificate"].encode("ascii")
    new_fp = fingerprint(cert_pem)
    new_fullchain = cert_pem.rstrip() + b"\n" + exported["CertificateChain"].encode("ascii")
    if new_fp == old_fp and new_fullchain == (previous / "fullchain.pem").read_bytes():
        print("UNCHANGED: certificate already served")
        return

    candidate = BASE / "versions" / uuid.uuid4().hex
    candidate.mkdir(mode=0o700)
    # Failed candidates and the previous generation remain root-only for recovery
    validate_material(cert_pem, exported["CertificateChain"].encode("ascii"),
                      exported["PrivateKey"].encode("ascii"), passphrase,
                      candidate, config["hostname"])
    activate(candidate, previous, test_command, service, config["hostname"], new_fp, old_fp)
    print("SUCCESS: configuration, reload and local TLS verified")


def main():
    import fcntl  # Linux only
    if os.geteuid() != 0:
        raise RuntimeError("Run as root")
    os.umask(0o077)
    private_root_path(CONFIG)
    private_root_path(BASE, directory=True)
    private_root_path(BASE / "versions", directory=True)
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    if config["certificate_arn"].split(":")[3] != config["region"]:
        raise RuntimeError("Certificate region mismatch")
    with (BASE / ".deploy.lock").open("a") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        deploy(config)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Do not output exceptions, AWS responses, PEM material or passphrases
        print("FAILED: inspect host state; no secret values logged", file=sys.stderr)
        sys.exit(1)
