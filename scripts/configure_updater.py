#!/usr/bin/env python3
"""Create a release-only Tauri overlay from a REAL public key; never creates keys."""
import argparse, base64, json, os, re
from pathlib import Path

def validate_public_key(value):
    value=value.strip()
    try:
        text=base64.b64decode(value,validate=True).decode("ascii")
        lines=text.strip().splitlines()
        raw=base64.b64decode(lines[-1],validate=True)
        if len(raw)!=42 or raw[:2]!=b"Ed" or "secret" in text.lower():raise ValueError()
    except (ValueError,UnicodeError,IndexError):
        raise ValueError("Supply the real Tauri/minisign public key (not a filename or private key).") from None
    return value

def signing_identity(value,certificate="",password="",ci=False):
    value=value.strip()
    if not value or len(value)>256 or any(ord(c)<32 for c in value):raise ValueError("Use an exact installed code-signing identity or '-'.")
    if value=="-" and certificate:raise ValueError("A certificate is configured but app signing is still ad-hoc. Set MACOS_SIGNING_IDENTITY explicitly.")
    if ci and value!="-" and (not certificate or not password):raise ValueError("Stable app signing requires APPLE_CERTIFICATE and APPLE_CERTIFICATE_PASSWORD secrets; no ad-hoc fallback is allowed.")
    return value

def overlay(key,repository,identity="-"):
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?/[A-Za-z0-9_.-]+",repository) or repository.split("/")[-1] in (".",".."):raise ValueError("Use OWNER/REPO for the public release repository.")
    return {"bundle":{"createUpdaterArtifacts":True,"macOS":{"signingIdentity":signing_identity(identity)}},"plugins":{"updater":{"pubkey":validate_public_key(key),"endpoints":[f"https://github.com/{repository}/releases/latest/download/latest.json"]}}}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument("--public-key-file",type=Path);p.add_argument("--repository",default="phat-trann/FerShot-X");p.add_argument("--output",type=Path,default=Path("src-tauri/tauri.updater.generated.json"));a=p.parse_args()
    key=a.public_key_file.read_text() if a.public_key_file else os.environ.get("TAURI_UPDATER_PUBLIC_KEY","")
    config=Path(__file__).resolve().parent.parent/"src-tauri/tauri.conf.json"
    pinned=json.loads(config.read_text()).get("plugins",{}).get("updater",{}).get("pubkey","")
    if not key.strip():key=pinned
    if not key.strip():p.error("Missing real public key: set TAURI_UPDATER_PUBLIC_KEY or --public-key-file. No key was generated.")
    try:
        identity=signing_identity(os.environ.get("APPLE_SIGNING_IDENTITY") or "-",os.environ.get("APPLE_CERTIFICATE",""),os.environ.get("APPLE_CERTIFICATE_PASSWORD",""),os.environ.get("GITHUB_ACTIONS")=="true")
        config=overlay(key,a.repository,identity)
        if pinned.strip():
            def material(value):return base64.b64decode(base64.b64decode(validate_public_key(value)).decode("ascii").strip().splitlines()[-1],validate=True)
            if material(key)!=material(pinned):raise ValueError("Public key differs from the pinned bootstrap key. Key rotation requires a separate migration.")
    except ValueError as e:p.error(str(e))
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(config,indent=2)+"\n");print("Signed updater overlay configured. Public key was not printed.")
if __name__=="__main__":main()
