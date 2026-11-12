"""Release-overlay checks use the real checked-in PUBLIC key, never private material."""
import base64,contextlib,io,json,os,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from configure_updater import main,overlay,validate_public_key,signing_identity

ROOT=Path(__file__).resolve().parent.parent
PUBLIC=json.loads((ROOT/"src-tauri/tauri.conf.json").read_text())["plugins"]["updater"]["pubkey"]
class ConfigureUpdaterTests(unittest.TestCase):
    def test_checked_in_key_is_real_structured_public_material(self):
        self.assertEqual(validate_public_key(PUBLIC),PUBLIC)
    def test_overlay_enables_updater_signatures_and_adhoc_app_signing(self):
        value=overlay(PUBLIC,"phat-trann/FerShot-X")
        self.assertIs(value["bundle"]["createUpdaterArtifacts"],True)
        self.assertEqual(value["bundle"]["macOS"]["signingIdentity"],"-")
        self.assertEqual(value["plugins"]["updater"]["endpoints"],["https://github.com/phat-trann/FerShot-X/releases/latest/download/latest.json"])
    def test_stable_identity_is_explicit_without_rotating_the_updater_key(self):
        value=overlay(PUBLIC,"phat-trann/FerShot-X","FerShot X Local Signing")
        self.assertEqual(value["bundle"]["macOS"]["signingIdentity"],"FerShot X Local Signing")
        self.assertEqual(value["plugins"]["updater"]["pubkey"],PUBLIC)
    def test_partial_ci_signing_configuration_never_falls_back_to_adhoc(self):
        for cert,password in [("",""),("test-certificate-presence","")]:
            with self.assertRaises(ValueError):signing_identity("FerShot X Local Signing",cert,password,True)
        with self.assertRaises(ValueError):signing_identity("-","test-certificate-presence","test-export-password",True)
        self.assertEqual(signing_identity("FerShot X Local Signing","test-certificate-presence","test-export-password",True),"FerShot X Local Signing")
        for value in ["","bad\nidentity"]:
            with self.assertRaises(ValueError):signing_identity(value)
    def test_invalid_inputs_are_not_accepted_as_configuration(self):
        for value in ["","not-a-key","PRIVATE KEY"]:
            with self.assertRaises(ValueError):validate_public_key(value)
        for repository in ["https://example.invalid/repo","../repo","owner/repo/other"]:
            with self.assertRaises(ValueError):overlay(PUBLIC,repository)
    def test_cli_falls_back_to_pinned_public_key_without_reading_private_file(self):
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder)/"overlay.json"
            with patch.dict(os.environ,{"TAURI_UPDATER_PUBLIC_KEY":"","APPLE_SIGNING_IDENTITY":"-","APPLE_CERTIFICATE":"","APPLE_CERTIFICATE_PASSWORD":""}),patch("sys.argv",["configure_updater.py","--output",str(output)]),contextlib.redirect_stdout(io.StringIO()):main()
            value=json.loads(output.read_text())
            self.assertEqual(value["plugins"]["updater"]["pubkey"],PUBLIC)
            self.assertNotIn("password",output.read_text().lower())
    def test_corrupted_public_key_override_cannot_silently_rotate_bootstrap(self):
        # Mutate public bytes only to exercise rejection; never deploy this value.
        lines=base64.b64decode(PUBLIC).decode("ascii").splitlines();raw=bytearray(base64.b64decode(lines[-1]));raw[-1]^=1;lines[-1]=base64.b64encode(raw).decode("ascii");corrupted=base64.b64encode(("\n".join(lines)+"\n").encode()).decode("ascii")
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder)/"overlay.json"
            with patch.dict(os.environ,{"TAURI_UPDATER_PUBLIC_KEY":corrupted,"APPLE_SIGNING_IDENTITY":"-","APPLE_CERTIFICATE":"","APPLE_CERTIFICATE_PASSWORD":""}),patch("sys.argv",["configure_updater.py","--output",str(output)]),contextlib.redirect_stderr(io.StringIO()),self.assertRaises(SystemExit):main()
            self.assertFalse(output.exists())
if __name__=="__main__":unittest.main()
