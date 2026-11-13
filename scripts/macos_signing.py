#!/usr/bin/env python3
"""CI-only certificate import and app verification; never touch a local keychain."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import secrets
import shlex
import shutil
import subprocess
import tarfile
import tempfile
from urllib.parse import unquote, urlparse


class SigningFailure(RuntimeError):
    pass


def command(args, *, env=None):
    result = subprocess.run(args, env=env, capture_output=True)
    if result.returncode:
        # Never include argv, raw output, certificate data or passwords in errors.
        raise SigningFailure("Signing command failed: " + Path(args[0]).name + " " + args[1])
    return result.stdout


def ci_only(env):
    if env.get("GITHUB_ACTIONS") != "true" or env.get("RUNNER_OS") != "macOS":
        raise SigningFailure("Certificate operations are restricted to the macOS GitHub runner.")
    if any(name in env for name in ("APPLE_ID", "APPLE_PASSWORD", "APPLE_TEAM_ID", "APPLE_API_KEY", "APPLE_API_ISSUER", "APPLE_API_KEY_PATH")):
        raise SigningFailure("Notarization credentials must not be supplied to this workflow.")


def identity_config(env):
    identity = env.get("APPLE_SIGNING_IDENTITY", "").strip()
    if not identity or identity == "-" or len(identity) > 256 or any(ord(c) < 32 for c in identity):
        raise SigningFailure("Set MACOS_SIGNING_IDENTITY to the exact certificate identity; ad-hoc fallback is disabled.")
    encoded = env.get("APPLE_CERTIFICATE", "")
    if not encoded or len(encoded) > 8 * 1024 * 1024:
        raise SigningFailure("Missing or oversized APPLE_CERTIFICATE secret.")
    try:
        data = base64.b64decode("".join(encoded.split()), validate=True)
    except ValueError:
        raise SigningFailure("APPLE_CERTIFICATE must be base64-encoded PKCS#12.") from None
    if not data or len(data) > 4 * 1024 * 1024:
        raise SigningFailure("Empty or oversized PKCS#12 certificate.")
    return identity, data, env.get("APPLE_CERTIFICATE_PASSWORD", "")


def export_environment(env, values):
    with open(env["GITHUB_ENV"], "a") as output:
        for name, value in values.items():
            if "\n" in value or "\r" in value:
                raise SigningFailure("Invalid signing environment metadata.")
            output.write(name + "=" + value + "\n")


def save_state(path, state):
    path.write_text(json.dumps(state))
    path.chmod(0o600)


def state_at(env, path):
    root = Path(env["RUNNER_TEMP"]).resolve()
    path = Path(path)
    if path.is_symlink() or path.parent.is_symlink():
        raise SigningFailure("Unsafe signing state.")
    folder = path.parent.resolve()
    if folder.parent != root or not folder.name.startswith("fershot-signing-") or path.name != "state.json":
        raise SigningFailure("Signing state is outside the owned runner directory.")
    state = json.loads(path.read_text())
    if state["keychain"] != str(folder / "release.keychain-db"):
        raise SigningFailure("Unexpected signing keychain path.")
    return folder, state


def cleanup(env, path, run=command):
    ci_only(env)
    if not Path(path).exists():
        return
    folder, state = state_at(env, path)
    # Only restore the runner search list; existing keychain entries are untouched.
    if state["search_changed"]:
        run(["/usr/bin/security", "list-keychains", "-d", "user", "-s", *state["previous_search"]])
    if state["created"]:
        run(["/usr/bin/security", "delete-keychain", state["keychain"]])
    shutil.rmtree(folder)


def certificate_matches(path, sha256):
    if not path.is_file() or path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest() != sha256:
        raise SigningFailure("The signed binary certificate differs from the imported certificate.")


def verify_binary(binary, folder, state, run=command, architecture=None):
    run(["/usr/bin/codesign", "--verify", "--deep", "--strict", "--all-architectures", str(binary)])
    prefix = folder / ("verify-" + (architecture or "probe") + "-")
    certificate = Path(str(prefix) + "0")
    certificate.unlink(missing_ok=True)
    args = ["/usr/bin/codesign", "--display"]
    if architecture:
        args += ["--architecture", architecture]
    run([*args, "--extract-certificates=" + str(prefix), str(binary)])
    certificate_matches(certificate, state["sha256"])


def prepare(env, run=command):
    ci_only(env)
    identity, data, password = identity_config(env)
    folder = Path(tempfile.mkdtemp(prefix="fershot-signing-", dir=env["RUNNER_TEMP"])).resolve()
    folder.chmod(0o700)
    path = folder / "state.json"
    keychain = str(folder / "release.keychain-db")
    state = {"keychain": keychain, "created": False, "search_changed": False, "previous_search": []}
    save_state(path, state)
    export_environment(env, {"FERSHOT_SIGNING_STATE": str(path)})
    p12 = folder / "certificate.p12"
    pem = folder / "certificate.pem"
    try:
        p12.write_bytes(data)
        p12.chmod(0o600)
        process_env = dict(env, FERSHOT_P12_PASSWORD=password)
        run(["/usr/bin/openssl", "pkcs12", "-in", str(p12), "-passin", "env:FERSHOT_P12_PASSWORD", "-clcerts", "-nokeys", "-out", str(pem)], env=process_env)
        if pem.read_bytes().count(b"-----BEGIN CERTIFICATE-----") != 1:
            raise SigningFailure("PKCS#12 must contain one signing certificate and its private key.")
        run(["/usr/bin/openssl", "x509", "-in", str(pem), "-checkend", "0", "-noout"])
        der = run(["/usr/bin/openssl", "x509", "-in", str(pem), "-outform", "DER"])
        state.update(sha1=hashlib.sha1(der).hexdigest().upper(), sha256=hashlib.sha256(der).hexdigest(), identity=identity)
        state["previous_search"] = shlex.split(run(["/usr/bin/security", "list-keychains", "-d", "user"]).decode())
        save_state(path, state)
        keychain_password = secrets.token_urlsafe(32)
        state["search_changed"] = True
        save_state(path, state)
        run(["/usr/bin/security", "create-keychain", "-p", keychain_password, keychain])
        state["created"] = True
        save_state(path, state)
        run(["/usr/bin/security", "unlock-keychain", "-p", keychain_password, keychain])
        run(["/usr/bin/security", "set-keychain-settings", "-lut", "7200", keychain])
        run(["/usr/bin/security", "import", str(p12), "-k", keychain, "-P", password, "-T", "/usr/bin/codesign"])
        run(["/usr/bin/security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", keychain_password, keychain])
        listing = run(["/usr/bin/security", "find-identity", "-p", "codesigning", keychain]).decode()
        identities = set(re.findall(r'^\s*\d+\)\s+([A-Fa-f0-9]{40})\s+"([^"\n]+)"', listing, re.M))
        identities = {(fingerprint.upper(), name) for fingerprint, name in identities}
        if identities != {(state["sha1"], identity)}:
            raise SigningFailure("Imported signing identity/private key does not exactly match MACOS_SIGNING_IDENTITY.")
        # Scope any private-key authorization changes to the newly created CI keychain.
        state["search_changed"] = True
        save_state(path, state)
        run(["/usr/bin/security", "list-keychains", "-d", "user", "-s", keychain, *state["previous_search"]])
        probe = folder / "signing-probe"
        shutil.copyfile("/usr/bin/true", probe)
        run(["/usr/bin/codesign", "--force", "--sign", state["sha1"], "--keychain", keychain, "--timestamp=none", str(probe)])
        verify_binary(probe, folder, state, run)
        # Tauri uses this imported identity by name, without a second certificate import.
        p12.unlink()
        pem.unlink()
        return path
    except Exception:
        cleanup(env, path, run)
        raise


def verify_app(env, path, app, run=command, expected_architectures=None):
    ci_only(env)
    folder, state = state_at(env, path)
    app = Path(app)
    if app.is_symlink() or not app.is_dir() or app.suffix != ".app":
        raise SigningFailure("Expected built .app is absent.")
    info = plistlib.loads((app / "Contents/Info.plist").read_bytes())
    if info.get("CFBundleIdentifier") != "dev.fershot.x" or info.get("CFBundleExecutable") != "FerShot X":
        raise SigningFailure("Unexpected signed app identity.")
    binary = app / "Contents/MacOS/FerShot X"
    architectures = set(run(["/usr/bin/lipo", "-archs", str(binary)]).decode().split())
    expected = {"arm64", "x86_64"} if expected_architectures is None else set(expected_architectures)
    if not expected or not expected <= {"arm64", "x86_64"} or architectures != expected:
        raise SigningFailure("The release app does not match its expected Mac architecture.")
    for architecture in sorted(architectures):
        verify_binary(app, folder, state, run, architecture)


def verify_archives(env, path, assets, run=command, manifest=None, targets=None):
    ci_only(env)
    archives = list(Path(assets).glob("*.app.tar.gz"))
    if not archives:
        raise SigningFailure("No updater app archive was downloaded.")
    expected = {}
    if manifest is not None:
        value = json.loads(Path(manifest).read_text())
        for target, arch in targets or [("darwin-aarch64", "arm64"), ("darwin-x86_64", "x86_64")]:
            name = unquote(urlparse(value["platforms"][target]["url"]).path.rsplit("/", 1)[-1])
            if not name or Path(name).name != name or "/" in name or "\\" in name or name in expected:
                raise SigningFailure("Split updater archives must have distinct safe asset names.")
            expected[name] = {arch}
        if {archive.name for archive in archives} != set(expected):
            raise SigningFailure("Downloaded updater archives do not match the expected manifest targets.")
    for archive in archives:
        with tempfile.TemporaryDirectory(prefix="fershot-verify-", dir=env["RUNNER_TEMP"]) as folder:
            with tarfile.open(archive) as stream:
                stream.extractall(folder, filter="data")
            apps = list(Path(folder).glob("*.app"))
            if len(apps) != 1:
                raise SigningFailure("Updater archive must contain exactly one app.")
            verify_app(env, path, apps[0], run, expected.get(archive.name))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "verify", "verify-archives", "cleanup"])
    parser.add_argument("--app", type=Path)
    parser.add_argument("--assets", type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--architecture", choices=["arm64", "x86_64"])
    args = parser.parse_args()
    env = dict(os.environ)
    try:
        if args.action == "prepare":
            prepare(env)
        else:
            state = env.get("FERSHOT_SIGNING_STATE")
            if not state:
                raise SigningFailure("Certificate import did not establish signing state.")
            if args.action == "cleanup":
                cleanup(env, state)
            elif args.action == "verify" and args.app:
                verify_app(env, state, args.app, expected_architectures={args.architecture} if args.architecture else None)
            elif args.action == "verify-archives" and args.assets:
                verify_archives(env, state, args.assets, manifest=args.manifest, targets=[("darwin-aarch64", "arm64")] if args.architecture == "arm64" else None)
            else:
                raise SigningFailure("Missing app/assets argument.")
        print("macOS signing step completed: " + args.action)
    except Exception as error:
        parser.exit(1, (str(error) if isinstance(error, SigningFailure) else "macOS signing preparation/verification failed.") + "\n")


if __name__ == "__main__":
    main()
