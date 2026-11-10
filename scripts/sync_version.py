#!/usr/bin/env python3
"""Synchronize product metadata from package.json; --check never writes."""
import argparse
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

def updates(root):
    package = json.loads((root / 'package.json').read_text())
    version = package['version']
    if not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?', version):
        raise ValueError('package.json must contain a semantic product version')
    result = {}
    for name in ['package-lock.json', 'src-tauri/tauri.conf.json']:
        path = root / name
        data = json.loads(path.read_text())
        data['version'] = version
        if name == 'package-lock.json':
            data['name'] = package['name']
            data['packages']['']['version'] = version
            data['packages']['']['name'] = package['name']
        result[path] = json.dumps(data, indent=2) + '\n'
    cargo_path = root / 'src-tauri/Cargo.toml'
    cargo = cargo_path.read_text()
    section = re.search(r'(?ms)^\[package\]\s*\n(.*?)(?=^\[|\Z)', cargo)
    if not section:
        raise ValueError('Native package metadata is missing')
    name_match = re.search(r'(?m)^name\s*=\s*("[^"\n]+")\s*$', section[1])
    if not name_match:
        raise ValueError('Native package name is missing')
    name = json.loads(name_match[1])
    body, count = re.subn(r'(?m)^version\s*=\s*"[^"]+"', f'version = "{version}"', section[1], count=1)
    if count != 1:
        raise ValueError('Native package version is missing')
    result[cargo_path] = cargo[:section.start(1)] + body + cargo[section.end(1):]
    lock_path = root / 'src-tauri/Cargo.lock'
    lock = lock_path.read_text()
    blocks = lock.split('[[package]]')
    found = 0
    for i, block in enumerate(blocks[1:], 1):
        if re.search(r'(?m)^name = ' + re.escape(json.dumps(name)) + r'$', block):
            blocks[i], count = re.subn(r'(?m)^version = "[^"]+"', f'version = "{version}"', block, count=1)
            found += count
    if found != 1:
        raise ValueError('Expected exactly one native root package in Cargo.lock')
    result[lock_path] = '[[package]]'.join(blocks)
    readme_path = root / 'README.md'
    readme, count = re.subn(r'\A# FerShot X[^\n]*', f'# FerShot X {version}', readme_path.read_text(), count=1)
    if count != 1:
        raise ValueError('README product heading is missing')
    result[readme_path] = readme
    # UI reads package.json directly; native app_info reads CARGO_PKG_VERSION.
    return version, {path: text for path, text in result.items() if path.read_text() != text}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    try:
        version, pending = updates(ROOT)
        if args.check and pending:
            print('Version drift: ' + ', '.join(str(p.relative_to(ROOT)) for p in pending), file=sys.stderr)
            return 1
        for path, text in pending.items():
            path.write_text(text)
        print(f'Product version {version}: ' + ('consistent' if args.check else f'synchronized ({len(pending)} files)'))
        return 0
    except (ValueError, OSError, KeyError) as error:
        print(str(error), file=sys.stderr)
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
