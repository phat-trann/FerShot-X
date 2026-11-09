#!/usr/bin/env python3
"""Run three real app processes with a unique, isolated configuration identity.

Requires an explicit native-acceptance build. Never runs capture, clipboard writes,
privacy prompts, global shortcut registration, notification or login operations.
"""
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
ident = f"dev.ferby.shottr.acceptance.c44-{time.time_ns()}"
reports = []
for phase in range(1, 4):
    report = ROOT / "artifacts" / f"C44-native-phase-{phase}-{ident.rsplit('-', 1)[1]}.json"
    env = dict(os.environ, FERBY_ACCEPTANCE_ID=ident, FERBY_ACCEPTANCE_PHASE=str(phase), FERBY_ACCEPTANCE_REPORT=str(report))
    with (ROOT / "artifacts" / f"C44-native-phase-{phase}.log").open("w") as log:
        process = subprocess.Popen([str(ROOT / "src-tauri/target/debug/ferby-shottr")], env=env, stdout=log, stderr=subprocess.STDOUT)
        try:
            code = process.wait(timeout=90)
        except subprocess.TimeoutExpired:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            raise RuntimeError(f"Owned phase {phase} timed out; see its log")
    if not report.exists():
        raise RuntimeError(f"Phase {phase} exited {code} without a report; see its log")
    value = json.loads(report.read_text())
    reports.append({"report": str(report.relative_to(ROOT)), "result": value})
    print(json.dumps({"phase": phase, "exit": code, "report": str(report.relative_to(ROOT)), "ok": value.get("ok"), "checks": value.get("checks"), "error": value.get("error")}), flush=True)
    if code or value.get("ok") is not True:
        raise RuntimeError(f"Native phase {phase} failed")
(ROOT / "artifacts/C44-native-summary.json").write_text(json.dumps({"id": ident, "reports": reports}, indent=2) + "\n")
print("Three real native processes passed; isolated fixtures retained at the report's configDir.")
