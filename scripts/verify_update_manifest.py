#!/usr/bin/env python3
"""Validate action-generated manifest structure before making a release public."""
import argparse,base64,json,subprocess,tempfile
from pathlib import Path
from urllib.parse import urlparse,unquote,quote

def verify(value,tag,repository,require_split=False):
    if value.get("version")!=tag.removeprefix("v"):raise ValueError("Updater version does not match tag")
    platforms=value.get("platforms",{})
    for target in ["darwin-aarch64","darwin-x86_64"]:
        item=platforms.get(target,{})
        signature=base64.b64decode(item.get("signature",""),validate=True)
        if not signature or len(signature)>4096:raise ValueError("Missing bounded updater signature")
        url=urlparse(item.get("url",""))
        prefix=f"/{repository}/releases/download/{tag}/"
        if url.scheme!="https" or url.netloc!="github.com" or not url.path.startswith(prefix) or not url.path.endswith(".app.tar.gz") or url.query or url.fragment:raise ValueError("Unexpected updater artifact URL")
    if require_split:
        urls=[platforms[target]["url"] for target in ["darwin-aarch64","darwin-x86_64"]]
        if urls[0]==urls[1] or any("universal" in key for key in platforms):raise ValueError("Expected distinct architecture-specific updater artifacts")
        for target in ["darwin-aarch64","darwin-x86_64"]:
            alias=platforms.get(target+"-app")
            if alias is not None and alias!=platforms[target]:raise ValueError("Updater installer alias differs from its architecture target")
    return True
def normalize_asset_urls(value,metadata,tag,repository):
    """Resolve action v1 API asset URLs against this draft's actual metadata."""
    if metadata.get("tag_name")!=tag:raise ValueError("Release metadata tag does not match")
    assets={str(asset.get("id")):asset for asset in metadata.get("assets",[])}
    api_prefix=f"https://api.github.com/repos/{repository}/releases/assets/"
    public_prefix=f"https://github.com/{repository}/releases/download/{tag}/"
    for item in value.get("platforms",{}).values():
        url=item.get("url","")
        if url.startswith(public_prefix):continue
        if not url.startswith(api_prefix):raise ValueError("Unexpected updater API asset URL")
        asset_id=url[len(api_prefix):]
        if not asset_id.isdigit() or asset_id not in assets:raise ValueError("Unknown updater release asset")
        asset=assets[asset_id];name=asset.get("name","")
        if not name.endswith(".app.tar.gz") or Path(name).name!=name or "/" in name or "\\" in name:raise ValueError("Unexpected updater asset name")
        # Draft assets may advertise an untagged temporary URL. Construct the
        # immutable public URL from the validated tag and exact asset name.
        item["url"]=public_prefix+quote(name,safe="")
    return value
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
    p=argparse.ArgumentParser();p.add_argument("manifest");p.add_argument("--require-split",action="store_true");p.add_argument("--tag",required=True);p.add_argument("--repository",required=True);p.add_argument("--assets-dir",type=Path);p.add_argument("--public-key-config",type=Path);p.add_argument("--release-metadata",type=Path);a=p.parse_args()
    value=json.load(open(a.manifest))
    if a.release_metadata:normalize_asset_urls(value,json.loads(a.release_metadata.read_text()),a.tag,a.repository)
    verify(value,a.tag,a.repository,a.require_split)
    if bool(a.assets_dir)!=bool(a.public_key_config):p.error("Pass both --assets-dir and --public-key-config for signature verification")
    if a.assets_dir:verify_artifacts(value,a.assets_dir,a.public_key_config)
    if a.release_metadata:Path(a.manifest).write_text(json.dumps(value,indent=2)+"\n")
    print("Updater manifest validated"+("; artifact signatures match the embedded key." if a.assets_dir else "."))
