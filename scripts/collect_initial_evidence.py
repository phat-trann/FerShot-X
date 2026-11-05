#!/usr/bin/env python3
"""Collect static REA evidence from Shottr; never launch or modify the target."""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import os
from pathlib import Path
import plistlib
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', default='/Applications/Shottr.app')
    parser.add_argument('--node-bin', default=str(Path.home() / '.nvm/versions/node/v26.13.0/bin'))
    args = parser.parse_args()
    app = Path(args.app).resolve()
    info_path = app / 'Contents/Info.plist'
    info = plistlib.loads(info_path.read_bytes())
    binary = app / 'Contents/MacOS' / info['CFBundleExecutable']
    raw = ROOT / 'evidence/raw'
    raw.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    node_bin = Path(args.node_bin)
    env['PATH'] = str(node_bin) + os.pathsep + env.get('PATH', '')
    base = ['rtk', 'proxy', str(node_bin / 'node'), str(node_bin / 'npx'), '--yes', 'rea-agents@6.8.0']
    commands = {
        'plist': ['inspect-plist', str(app)],
        'interface-builder': ['decode-interface-builder', str(app)],
        'macho': ['inspect-macho', str(app)],
    }

    def collect(item):
        label, command = item
        result = subprocess.run(base + command + ['--format', 'json'], env=env, capture_output=True, text=True, timeout=180)
        (raw / (label + '.json')).write_text(result.stdout)
        (raw / (label + '.stderr.log')).write_text(result.stderr)
        record = {'command': command, 'exit_code': result.returncode, 'path': 'evidence/raw/' + label + '.json'}
        try:
            payload = json.loads(result.stdout)
            record['evidence_id'] = payload.get('evidence_id')
            record['top_level_keys'] = list(payload)
        except json.JSONDecodeError:
            record['parse_error'] = True
        print(label + ': ' + json.dumps(record), flush=True)
        return label, record

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = dict(pool.map(collect, commands.items()))
    identity = {
        'collected_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'app_path': str(app),
        'bundle_id': info.get('CFBundleIdentifier'),
        'version': info.get('CFBundleShortVersionString'),
        'build': info.get('CFBundleVersion'),
        'minimum_macos': info.get('LSMinimumSystemVersion'),
        'executable': str(binary),
        'executable_sha256': hashlib.sha256(binary.read_bytes()).hexdigest(),
        'info_plist_sha256': hashlib.sha256(info_path.read_bytes()).hexdigest(),
        'rea_version': '6.8.0',
        'collection_mode': 'static; no target launch, user preferences, screenshot library or keychain access',
        'operations': results,
    }
    (ROOT / 'evidence/target.json').write_text(json.dumps(identity, indent=2) + '\n')
    if any(r['exit_code'] or r.get('parse_error') for r in results.values()):
        raise SystemExit('One or more operations failed; inspect evidence/raw before drawing conclusions.')


if __name__ == '__main__':
    main()
