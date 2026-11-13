"""No real keys, security commands, codesigning or keychain changes are used."""
import base64
import hashlib
import json
from pathlib import Path
import plistlib
import tarfile
import tempfile
import unittest

from macos_signing import SigningFailure, cleanup, identity_config, prepare, verify_app, verify_archives

PUBLIC_DER = b"synthetic-public-certificate-metadata-not-a-signing-key"
SHA1 = hashlib.sha1(PUBLIC_DER).hexdigest().upper()


class FakeCommands:
    def __init__(self, wrong_identity=False, wrong_certificate=False, fail=None):
        self.calls = []
        self.wrong_identity = wrong_identity
        self.wrong_certificate = wrong_certificate
        self.fail = fail

    def __call__(self, args, *, env=None):
        self.calls.append(args)
        if self.fail and self.fail in args:
            raise SigningFailure("Injected signing command failure")
        tool = Path(args[0]).name
        if tool == "openssl":
            if "pkcs12" in args:
                Path(args[args.index("-out") + 1]).write_bytes(b"-----BEGIN CERTIFICATE-----\npublic fixture\n-----END CERTIFICATE-----")
            if "DER" in args:
                return PUBLIC_DER
        if tool == "security":
            if args[1] == "list-keychains" and "-s" not in args:
                return b'"/runner/login.keychain-db"\n"/runner/System.keychain"\n'
            if args[1] == "find-identity":
                name = "Different certificate" if self.wrong_identity else "FerShot X"
                return f'  1) {SHA1} "{name}"\n'.encode()
        if tool == "codesign" and any(a.startswith("--extract-certificates=") for a in args):
            prefix = next(a.split("=", 1)[1] for a in args if a.startswith("--extract-certificates="))
            Path(prefix + "0").write_bytes(b"wrong public certificate" if self.wrong_certificate else PUBLIC_DER)
        if tool == "lipo":
            data = Path(args[-1]).read_bytes()
            return data if data in (b"arm64", b"x86_64") else b"x86_64 arm64\n"
        return b""


class MacSigningTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        self.env = {"GITHUB_ACTIONS": "true", "RUNNER_OS": "macOS", "RUNNER_TEMP": str(self.root),
                    "GITHUB_ENV": str(self.root / "github-env"), "APPLE_SIGNING_IDENTITY": "FerShot X",
                    "APPLE_CERTIFICATE": base64.b64encode(b"synthetic-p12-boundary-fixture").decode()}
        self.addCleanup(self.temp.cleanup)

    def app(self):
        app = self.root / "FerShot X.app"
        (app / "Contents/MacOS").mkdir(parents=True)
        (app / "Contents/Info.plist").write_bytes(plistlib.dumps({"CFBundleIdentifier": "dev.fershot.x", "CFBundleExecutable": "FerShot X"}))
        (app / "Contents/MacOS/FerShot X").write_bytes(b"synthetic-binary")
        return app

    def test_passwordless_import_probe_and_both_architecture_verification(self):
        fake = FakeCommands()
        path = prepare(self.env, fake)
        state = json.loads(path.read_text())
        imports = [c for c in fake.calls if c[1] == "import"]
        self.assertEqual(imports[0][imports[0].index("-P") + 1], "")
        self.assertEqual(state["sha256"], hashlib.sha256(PUBLIC_DER).hexdigest())
        self.assertFalse((path.parent / "certificate.p12").exists())
        self.assertNotIn("synthetic-p12", path.read_text())
        self.assertNotIn("APPLE_CERTIFICATE=", Path(self.env["GITHUB_ENV"]).read_text())
        verify_app(self.env, path, self.app(), fake)
        self.assertFalse(any("--extract-certificates" in c for c in fake.calls))
        architectures = {c[c.index("--architecture") + 1] for c in fake.calls if "--architecture" in c}
        self.assertEqual(architectures, {"arm64", "x86_64"})
        cleanup(self.env, path, fake)
        self.assertFalse(path.parent.exists())
        self.assertEqual(fake.calls[-2], ["/usr/bin/security", "list-keychains", "-d", "user", "-s", "/runner/login.keychain-db", "/runner/System.keychain"])
        self.assertEqual(fake.calls[-1], ["/usr/bin/security", "delete-keychain", state["keychain"]])
        self.assertFalse(any(c[1] in ("add-trusted-cert", "default-keychain") for c in fake.calls))

    def test_missing_invalid_and_adhoc_configuration_fails_before_any_command(self):
        for patch in [{"APPLE_SIGNING_IDENTITY": ""}, {"APPLE_SIGNING_IDENTITY": "-"}, {"APPLE_CERTIFICATE": ""}, {"APPLE_CERTIFICATE": "not base64!"}]:
            fake = FakeCommands()
            with self.assertRaises(SigningFailure):
                prepare(dict(self.env, **patch), fake)
            self.assertEqual(fake.calls, [])

    def test_local_machine_and_notarization_credentials_are_rejected(self):
        for patch in [{"GITHUB_ACTIONS": "false"}, {"RUNNER_OS": "Linux"}, {"APPLE_ID": ""}, {"APPLE_API_KEY": "notary-disabled"}]:
            fake = FakeCommands()
            with self.assertRaises(SigningFailure):
                prepare(dict(self.env, **patch), fake)
            self.assertEqual(fake.calls, [])

    def test_name_mismatch_import_failure_and_probe_failure_clean_up_owned_keychain(self):
        for fake in [FakeCommands(wrong_identity=True), FakeCommands(fail="import"), FakeCommands(fail="--force"), FakeCommands(wrong_certificate=True)]:
            with self.assertRaises(SigningFailure):
                prepare(self.env, fake)
            deletes = [c for c in fake.calls if c[1] == "delete-keychain"]
            self.assertEqual(len(deletes), 1)
            self.assertTrue(Path(deletes[0][-1]).is_relative_to(self.root))
            self.assertEqual(list(self.root.glob("fershot-signing-*")), [])

    def test_final_certificate_mismatch_and_invalid_signature_block_publication(self):
        path = prepare(self.env, FakeCommands())
        app = self.app()
        for fake in [FakeCommands(wrong_certificate=True), FakeCommands(fail="--verify")]:
            with self.assertRaises(SigningFailure):
                verify_app(self.env, path, app, fake)

    def test_unsigned_or_missing_app_and_wrong_bundle_are_rejected(self):
        path = prepare(self.env, FakeCommands())
        with self.assertRaises(SigningFailure):
            verify_app(self.env, path, self.root / "missing.app", FakeCommands())
        app = self.app()
        (app / "Contents/Info.plist").write_bytes(plistlib.dumps({"CFBundleIdentifier": "other.app"}))
        with self.assertRaises(SigningFailure):
            verify_app(self.env, path, app, FakeCommands())

    def test_actual_distribution_archive_uses_the_same_verification(self):
        path = prepare(self.env, FakeCommands())
        app = self.app()
        assets = self.root / "assets"
        assets.mkdir()
        with tarfile.open(assets / "release.app.tar.gz", "w:gz") as stream:
            stream.add(app, arcname=app.name)
        verify_archives(self.env, path, assets, FakeCommands())
        with self.assertRaises(SigningFailure):
            verify_archives(self.env, path, assets, FakeCommands(wrong_certificate=True))

    def test_thin_app_must_match_requested_architecture_and_certificate(self):
        path = prepare(self.env, FakeCommands())
        app = self.app()
        binary = app / "Contents/MacOS/FerShot X"
        for arch in ("arm64", "x86_64"):
            binary.write_bytes(arch.encode())
            verify_app(self.env, path, app, FakeCommands(), {arch})
            for wrong in [{"x86_64" if arch == "arm64" else "arm64"}, {"arm64", "x86_64"}]:
                with self.assertRaises(SigningFailure):
                    verify_app(self.env, path, app, FakeCommands(), wrong)
            with self.assertRaises(SigningFailure):
                verify_app(self.env, path, app, FakeCommands(wrong_certificate=True), {arch})

    def test_split_archives_verify_manifest_mapping_and_reject_swapped_binaries(self):
        path = prepare(self.env, FakeCommands())
        app = self.app()
        assets = self.root / "assets"
        assets.mkdir()
        manifest = self.root / "latest.json"
        platforms = {}
        for target, arch in [("darwin-aarch64", "arm64"), ("darwin-x86_64", "x86_64")]:
            name = target + ".app.tar.gz"
            platforms[target] = {"url": "https://github.com/owner/repo/releases/download/v1.2.1/" + name}
            (app / "Contents/MacOS/FerShot X").write_bytes(arch.encode())
            with tarfile.open(assets / name, "w:gz") as stream:
                stream.add(app, arcname=app.name)
        manifest.write_text(json.dumps({"platforms": platforms}))
        verify_archives(self.env, path, assets, FakeCommands(), manifest)
        # Swapping URLs keeps each signature valid but would deliver the wrong CPU binary.
        a, b = platforms.values()
        a["url"], b["url"] = b["url"], a["url"]
        manifest.write_text(json.dumps({"platforms": platforms}))
        with self.assertRaises(SigningFailure):
            verify_archives(self.env, path, assets, FakeCommands(), manifest)
        b["url"] = a["url"]
        manifest.write_text(json.dumps({"platforms": platforms}))
        with self.assertRaises(SigningFailure):
            verify_archives(self.env, path, assets, FakeCommands(), manifest)

    def test_arm_only_archive_must_contain_arm_binary(self):
        path = prepare(self.env, FakeCommands())
        app = self.app()
        assets = self.root / "assets"
        assets.mkdir()
        manifest = self.root / "latest.json"
        manifest.write_text(json.dumps({"platforms": {"darwin-aarch64": {"url": "https://github.com/owner/repo/releases/download/v1.2.2/arm.app.tar.gz"}}}))
        for arch in ("arm64", "x86_64"):
            (app / "Contents/MacOS/FerShot X").write_bytes(arch.encode())
            with tarfile.open(assets / "arm.app.tar.gz", "w:gz") as stream:
                stream.add(app, arcname=app.name)
            if arch == "arm64":
                verify_archives(self.env, path, assets, FakeCommands(), manifest, [("darwin-aarch64", "arm64")])
            else:
                with self.assertRaises(SigningFailure):
                    verify_archives(self.env, path, assets, FakeCommands(), manifest, [("darwin-aarch64", "arm64")])

    def test_cleanup_rejects_foreign_state_without_modifying_keychains(self):
        path = self.root / "foreign" / "state.json"
        path.parent.mkdir()
        path.write_text("{}")
        fake = FakeCommands()
        with self.assertRaises(SigningFailure):
            cleanup(self.env, path, fake)
        self.assertEqual(fake.calls, [])


if __name__ == "__main__":
    unittest.main()
