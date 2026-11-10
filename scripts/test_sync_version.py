import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('version_sync', Path(__file__).with_name('sync_version.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class VersionSyncTests(unittest.TestCase):
    def fixture(self, root):
        (root / 'src-tauri').mkdir()
        (root / 'package.json').write_text(json.dumps({'name': 'fershot-x', 'version': '1.2.3'}))
        (root / 'package-lock.json').write_text(json.dumps({'name': 'fershot-x', 'version': '1.0.0', 'packages': {'': {'name': 'fershot-x', 'version': '1.0.0'}, 'node_modules/library': {'version': '9.8.7'}}}))
        (root / 'src-tauri/tauri.conf.json').write_text(json.dumps({'productName': 'FerShot X', 'version': '1.0.0'}))
        (root / 'src-tauri/Cargo.toml').write_text('[package]\nname = "fershot-x"\nversion = "1.0.0"\n[dependencies]\nserde = "1"\n')
        (root / 'src-tauri/Cargo.lock').write_text('version = 4\n[[package]]\nname = "fershot-x"\nversion = "1.0.0"\n[[package]]\nname = "library"\nversion = "9.8.7"\n')
        (root / 'README.md').write_text('# FerShot X 1.0.0\n\nProduct details.\n')

    def test_detects_and_synchronizes_drift_without_upgrading_dependencies(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); self.fixture(root)
            version, pending = module.updates(root)
            self.assertEqual(version, '1.2.3'); self.assertEqual(len(pending), 5)
            self.assertIn('1.0.0', (root / 'src-tauri/Cargo.toml').read_text())
            for path, text in pending.items(): path.write_text(text)
            self.assertEqual(module.updates(root)[1], {})
            self.assertIn('version = "9.8.7"', (root / 'src-tauri/Cargo.lock').read_text())
            self.assertEqual(json.loads((root / 'package-lock.json').read_text())['packages']['node_modules/library']['version'], '9.8.7')

    def test_invalid_version_does_not_mutate_metadata(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); self.fixture(root)
            (root / 'package.json').write_text(json.dumps({'name': 'fershot-x', 'version': '01.2.3'}))
            original = (root / 'README.md').read_bytes()
            with self.assertRaises(ValueError): module.updates(root)
            self.assertEqual((root / 'README.md').read_bytes(), original)

if __name__ == '__main__': unittest.main()
