#!/usr/bin/env python3
"""Render the integrator-maintained MVP acceptance ledger; never infer completion from packets."""
import argparse
from decimal import Decimal
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def render(root):
    data = json.loads((root / "coordination/progress.json").read_text())
    if data["schema_version"] != 1:
        raise ValueError("Unsupported progress schema")
    milestones = data["milestones"]
    if sum(m["weight"] for m in milestones) != 100:
        raise ValueError("Milestone weights must total 100")
    rows, details, total, ids = [], [], Decimal(0), set()
    for item in milestones:
        if item["id"] in ids or type(item["weight"]) is not int or item["weight"] <= 0:
            raise ValueError("Invalid or duplicate milestone")
        ids.add(item["id"])
        gates = item["gates"]
        if not gates or any(type(g["done"]) is not bool for g in gates):
            raise ValueError("Each gate needs an explicit boolean acceptance")
        done = sum(g["done"] for g in gates)
        earned = Decimal(item["weight"]) * done / len(gates)
        total += earned
        rows.append(f'| {item["title"]} | {item["weight"]}% | {done}/{len(gates)} | {earned:g}% |')
        details += [f'### {item["title"]}', '']
        for gate in gates:
            evidence = Path(gate["evidence"])
            if gate["done"]:
                if evidence.is_absolute() or ".." in evidence.parts or not (root / evidence).is_file():
                    raise ValueError(f"Missing/local-only evidence: {evidence}")
                details.append(f'- [x] {gate["name"]}. [Evidence](../{evidence.as_posix()}).')
            else:
                details.append(f'- [ ] {gate["name"]}.')
        details.append('')
    lines = ['# Project progress', '', f'**{total:g}% accepted against the declared MVP baseline** (rounded: {total:.0f}%). Updated: {data["updated"]}.', '',
             data['scope'], '', '**Excluded/deferred:** ' + data['excluded'], '',
             'This is an evidence-based delivery score, not elapsed time, token consumption or full Shottr parity. Each milestone has equally weighted acceptance gates. Formula: sum(weight × accepted gates / total gates). Code existing, a DONE packet, or an isolated mock does not automatically pass a gate. Codex updates this ledger after review; workers propose evidence in completion packets. Native acceptance gates require real manual validation and remain unchecked.', '',
             '| Milestone | Weight | Accepted gates | Earned |', '| --- | --- | --- | --- |'] + rows + ['',
             '## Current work and blockers', '',
             *data.get('checkpoint_notes', [
             '- C01-C03/C05/C06 are preserved. Current integration checkpoints: C07 editor/raster, C08 clipboard import, C09 native pin and C10 format/quality preferences; broader tasks remain partial.',
             '- Antigravity A33 Rust Vision replaces inactive Swift A13. Current reviewed editor/pin/settings/clipboard modules are connected; further feature modules await integration review.',
             '- Copilot continues P01-P42 and H01; immutable current packet decisions are authoritative, not historical table labels.',
             '- Codex verification: 195 frontend unit tests, 22 selected browser E2E and 16 root Rust tests passed at this checkpoint. Native manual acceptance remains open; source/version checks preserve the 0.1.0 baseline.',
             '- Progress rose from 47.5% to 61.25% through composed editor/rendering, tested settings persistence core and restricted pin/controls implementation. No native manual gate or OCR gate was credited.',
             '- Continuous task lists cover Antigravity A01-A33 (A13 superseded) and Copilot P01-P42 + H01. The selector skips submitted work and superseded tasks; clients are not auto-launched or restarted.',
             '- Scrolling/effects/global hotkeys/archive/print and Rust OCR/QR remain on the broader functional roadmap; review/integration and user-only native acceptance still prevent parity/release claims.', 
             ]), '',
             'See [build queue](BUILD-QUEUE.md), [kickoff prompts](START-HERE.md), [review inbox](reviews/INDEX.md) and [C05 checks](../docs/agents/codex/C05-validation.md).', '',
             '## Acceptance ledger', ''] + details + [
             '## Update procedure', '',
             'Codex edits `coordination/progress.json` with concrete accepted-gate evidence, then runs `rtk proxy python3 scripts/project_progress.py`. Use `--check` to verify the generated document is current. Scope changes require an explicit baseline revision; do not quietly remove unfinished gates to raise the score.', '']
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = render(ROOT)
    target = ROOT / "coordination/PROGRESS.md"
    if args.check:
        if not target.exists() or target.read_text() != rendered:
            raise SystemExit("Progress document is stale; regenerate it")
        print("Progress ledger and document valid")
    else:
        target.write_text(rendered)
        print(target)


if __name__ == "__main__":
    main()
