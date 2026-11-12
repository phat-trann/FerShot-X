#!/usr/bin/env python3
"""Validate action-generated manifest structure before making a release public."""
import argparse,base64,json,subprocess,tempfile
from pathlib import Path
from urllib.parse import urlparse,unquote

def verify(value,tag,repository):
    if value.get("version")!=tag.removeprefix("v"):raise ValueError("Updater version does not match tag")
    platforms=value.get("platforms",{})
    for target in ["darwin-aarch64","darwin-x86_64"]:
        item=platforms.get(target,{})
        signature=base64.b64decode(item.get("signature",""),validate=True)
        if not signature or len(signature)>4096:raise ValueError("Missing bounded updater signature")
        url=urlparse(item.get("url",""))
        prefix=f"/{repository}/releases/download/{tag}/"
        if url.scheme!="https" or url.netloc!="github.com" or not url.path.startswith(prefix) or not url.path.endswith(".app.tar.gz") or url.query or url.fragment:raise ValueError("Unexpected updater artifact URL")
    return True
def verify_artifacts(value,assets,configuration):
    # Signature and public key are public metadata; no private signing key is read.
    key=json.loads(configuration.read_text())["plugins"]["updater"]["pubkey"]
    with tempfile.TemporaryDirectory(prefix="fershot-verify-") as folder:
        public=Path(folder)/"release.pub";public.write_bytes(base64.b64decode(key,validate=True))
        for target in ["darwin-aarch64","darwin-x86_64"]:
            item=value["platforms"][target];name=unquote(urlparse(item["url"]).path.rsplit("/",1)[-1])
            if not name or Path(name).name!=name or "/" in name or "\\" in name:raise ValueError("Unsafe release asset name")
            artifact=assets/name
            if not artifact.is_file() or artifact.is_symlink():raise ValueError("Updater artifact is absent")
            signature=Path(folder)/f"{target}.sig";signature.write_bytes(base64.b64decode(item["signature"],validate=True))
            result=subprocess.run(["minisign","-V","-m",str(artifact),"-p",str(public),"-x",str(signature)],capture_output=True)
            if result.returncode:raise ValueError("Updater signature does not match the embedded public key")

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("manifest");p.add_argument("--tag",required=True);p.add_argument("--repository",required=True);p.add_argument("--assets-dir",type=Path);p.add_argument("--public-key-config",type=Path);a=p.parse_args()
    value=json.load(open(a.manifest));verify(value,a.tag,a.repository)
    if bool(a.assets_dir)!=bool(a.public_key_config):p.error("Pass both --assets-dir and --public-key-config for signature verification")
    if a.assets_dir:verify_artifacts(value,a.assets_dir,a.public_key_config)
    print("Updater manifest validated"+("; artifact signatures match the embedded key." if a.assets_dir else "."))
