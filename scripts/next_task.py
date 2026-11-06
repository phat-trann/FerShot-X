#!/usr/bin/env python3
"""Choose one available task from immutable packets and claims; never launch clients or poll."""
import argparse
import json
from pathlib import Path
import re
import review_queue as q
import peer_review as peer
from review_policy import codex_review_credit

ROOT = Path(__file__).resolve().parents[1]


def candidates(root, agent):
    data = json.loads((root / "coordination/build-tasks.json").read_text())
    phase = data.get("execution_phase", {})
    implementation_first = phase.get("mode") == "implementation-first"
    packets = q.packets(root)
    latest = {}
    for packet in sorted(packets, key=lambda p: p["created_at"]):
        if packet["agent"] == agent:
            latest[packet["task"]] = packet
    decisions = {}
    for path in (root / "coordination/reviews/decisions").glob("*.json"):
        decision = json.loads(path.read_text())
        old = decisions.get(decision["submission_id"])
        if old is None or decision["created_at"] > old["created_at"]:
            decisions[decision["submission_id"]] = decision
    ready, skipped = [], []
    for task in data["tasks"]:
        if task["agent"] != agent:
            continue
        ident = task["id"]
        allowed = data.get("agent_task_allowlists", {}).get(agent)
        if allowed is not None and ident not in allowed:
            skipped.append({"id": ident, "reason": "outside current agent allocation"})
            continue
        if task.get("superseded_by"):
            skipped.append({"id": ident, "reason": "superseded", "replacement": task["superseded_by"]})
            continue
        if task.get("recurring_peer_review") and not peer.pending(root, agent):
            skipped.append({"id": ident, "reason": "no fresh independent peer-review input"})
            continue
        shared = task.get("shared_claim")
        if (root / "coordination/claims" / ident).exists() or (shared and (root / "coordination/claims" / shared).exists()):
            skipped.append({"id": ident, "reason": "claim occupied"})
            continue
        missing = [p for p in task.get("requires", []) if not (root / p).exists()]
        if missing:
            skipped.append({"id": ident, "reason": "missing local prerequisite", "missing": missing})
            continue
        reviewed_inputs = []
        unready = []
        provisional = implementation_first and phase.get("allow_provisional_integration") is True and task.get("work_kind") == "integration"
        for required in task.get("requires_reviewed_tasks", []):
            matches = [p for p in packets if p["task"] == required]
            producer = max(matches, key=lambda p: p["created_at"]) if matches else None
            decision = decisions.get(producer["id"]) if producer else None
            independent = peer.current(root, producer) if producer else []
            peer_approval = next((r for r in independent if r['decision'] == 'approved'
                                  and r['reviewer'] == 'antigravity'), None)
            if producer and producer['agent'] == 'codex':
                decision = peer_approval
                if not decision and codex_review_credit(root, producer):
                    decision = {"decision": "approved", "created_at": producer['created_at'],
                                "submission_sha256": q.digest(root / 'coordination/reviews/submissions' / (producer['id'] + '.json')),
                                "basis": "USER_WAIVED_REVIEW"}
            rejected = any(r['decision'] == 'changes_requested' for r in independent)
            legacy = decisions.get(producer['id']) if producer else None
            if legacy and legacy['decision'] == 'changes_requested':
                rejected = True
            if decision and producer:
                packet_path = root / 'coordination/reviews/submissions' / (producer['id'] + '.json')
                if decision.get('submission_sha256') != q.digest(packet_path):
                    decision = None
            if (not producer or producer["completion"] != "done" or q.stale(root, producer)
                or (not provisional and (not decision or decision["decision"] != "approved"))
                or rejected
                or (root / "coordination/claims" / required).exists()):
                unready.append(required)
            else:
                reviewed_inputs.append({"created_at": max(producer["created_at"], decision["created_at"] if decision else producer["created_at"])})
        if unready:
            skipped.append({"id": ident, "reason": "requires current reviewed input", "tasks": unready})
            continue
        packet = latest.get(ident)
        action, priority, note = "implement", task.get("queue_priority", 2), None
        if task.get('recurring_peer_review'):
            action, priority = 'review_peer_packets', 3
        if packet:
            decision = decisions.get(packet["id"])
            peer_changes = next((r for r in peer.current(root, packet)
                                 if r['decision'] == 'changes_requested'), None)
            if peer_changes:
                action, priority, note = "fix_review", 0, peer_changes['note']
            elif task.get("recurring_peer_review"):
                action, priority = "review_peer_packets", 3
            elif decision and decision["decision"] == "changes_requested":
                action, priority, note = "fix_review", 0, decision["note"]
            elif agent == "codex" and ident == "C04" and any(
                p["agent"] != "codex" and p['task'] != 'A38'
                and not q.stale(root, p) and p["id"] not in decisions for p in packets
            ):
                action, priority = "review_new_packets", 3
            elif packet["completion"] in ("partial", "blocked") and any(p["created_at"] > packet["created_at"] for p in reviewed_inputs):
                action, priority = "resume_reviewed_input", 1
            elif q.stale(root, packet):
                action, priority = "check_and_refresh_snapshot", 1
            elif task.get("state") == "RETRY" and packet["completion"] in ("partial", "blocked"):
                action = "resume"
            else:
                skipped.append({"id": ident, "reason": "current submission exists; continue other work", "packet": packet["id"]})
                continue
        elif task.get("state", "").startswith(("DONE", "APPROVED")):
            skipped.append({"id": ident, "reason": "already accepted/completed"})
            continue
        if implementation_first and task.get("defer_during_implementation") and action != 'fix_review':
            skipped.append({"id": ident, "reason": "validation expansion deferred during implementation-first phase"})
            continue
        if phase.get('defer_snapshot_only_refresh', implementation_first) and action == 'check_and_refresh_snapshot' and task.get('state') != 'RETRY':
            skipped.append({"id": ident, "reason": "snapshot-only refresh deferred to validation phase", "packet": packet['id']})
            continue
        if action != 'fix_review':
            kind = task.get('work_kind', 'implementation')
            if kind in ('review', 'integration', 'acceptance'):
                priority = {'review': 3, 'integration': 4, 'acceptance': 5}[kind]
                if phase.get('mode') in ('implementation-first', 'production-and-validation') and kind == 'review':
                    priority = 6
        ready.append({"task": task, "action": action, "priority": priority,
                      "latest_packet": packet["id"] if packet else None, "review_note": note})
    ready.sort(key=lambda item: (item["priority"], int(re.search(r"[0-9]+$", item["task"]["id"]).group())))
    return data, ready, skipped


def choose(root, agent, acquire=False):
    data, ready, skipped = candidates(root, agent)
    for item in ready:
        if not acquire:
            return {"next": item, "skipped": skipped, "claimed": []}
        task = item["task"]
        shared = task.get("shared_claim")
        claimed = []
        try:
            if shared:
                q.claim(root, agent, shared, data["request"])
                claimed.append(shared)
            q.claim(root, agent, task["id"], data["request"])
            claimed.append(task["id"])
        except FileExistsError:
            for ident in reversed(claimed):
                q.release(root, agent, ident)
            skipped.append({"id": task["id"], "reason": "claim acquired by another agent; skipped once"})
            continue
        return {"next": item, "skipped": skipped, "claimed": claimed}
    return {"next": None, "skipped": skipped, "claimed": [],
            "message": "No available work. Submit the request summary and stop; do not wait or poll."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent", required=True, choices=q.AGENTS)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--claim", action="store_true")
    group.add_argument("--all", action="store_true", help="Show available IDs/titles without claiming")
    args = parser.parse_args()
    if args.all:
        _, ready, skipped = candidates(ROOT, args.agent)
        result = {"available": [{"id": x["task"]["id"], "title": x["task"]["title"], "action": x["action"]} for x in ready], "skipped": skipped}
    else:
        result = choose(ROOT, args.agent, args.claim)
        result["skipped_count"] = len(result.pop("skipped"))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
