#!/usr/bin/env python3
"""Plan stable releases from package.json version increases on main."""
import argparse,json,os,re,subprocess
from pathlib import Path
PATTERN=r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)"
def version(value):
    if not isinstance(value,str) or not re.fullmatch(PATTERN,value):raise ValueError("Release version must be stable MAJOR.MINOR.PATCH")
    return tuple(map(int,value.split(".")))
def plan(event_name,ref,current,previous=None,pipeline_repaired=False):
    current_number=version(current)
    if ref!="refs/heads/main":return False,"Only main may publish releases"
    if event_name=="workflow_dispatch":return True,"Manual retry; published releases are checked separately"
    if event_name!="push":return False,"Unsupported release event"
    if previous is None:return True,"Initial main version"
    if current_number>version(previous):return True,f"Version increased from {previous} to {current}"
    if current_number==version(previous) and pipeline_repaired:return True,"Release pipeline changed; retry only if this version is still unpublished"
    return False,"Version unchanged or decreased; no release"
def previous_version(event):
    before=event.get("before","")
    if not before or set(before)=={"0"}:return None
    if not re.fullmatch(r"[a-fA-F0-9]{40,64}",before):raise ValueError("Invalid previous push commit")
    result=subprocess.run(["git","show",f"{before}:package.json"],capture_output=True,text=True)
    if result.returncode:raise ValueError("Cannot read previous package.json; fetch complete history before release detection")
    return json.loads(result.stdout)["version"]
def pipeline_changed(event):
    before=event.get("before","")
    if not re.fullmatch(r"[a-fA-F0-9]{40,64}",before):return False
    paths=[".github/workflows/release.yml","scripts/release_version.py","scripts/release_gate.cjs","scripts/verify_update_manifest.py","scripts/configure_updater.py"]
    result=subprocess.run(["git","diff","--name-only",before,"HEAD","--",*paths],capture_output=True,text=True)
    if result.returncode:raise ValueError("Cannot compare release pipeline changes")
    return bool(result.stdout.strip())
def main():
    p=argparse.ArgumentParser();p.add_argument("--event",type=Path,default=os.environ.get("GITHUB_EVENT_PATH"));p.add_argument("--output",type=Path,default=os.environ.get("GITHUB_OUTPUT"));a=p.parse_args()
    current=json.loads(Path("package.json").read_text())["version"];event=json.loads(a.event.read_text()) if a.event else {}
    name=os.environ.get("GITHUB_EVENT_NAME","push");previous=previous_version(event) if name=="push" else None
    repair=pipeline_changed(event) if name=="push" and previous==current else False
    eligible,reason=plan(name,os.environ.get("GITHUB_REF",""),current,previous,repair)
    result=f"eligible={str(eligible).lower()}\nversion={current}\ntag=v{current}\n"
    if a.output:
        with a.output.open("a") as stream:stream.write(result)
    print(reason)
if __name__=="__main__":main()
