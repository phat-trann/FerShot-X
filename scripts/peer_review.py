#!/usr/bin/env python3
"""Record independent, hash-bound reviews without changing producer packets."""
import argparse
import json
from pathlib import Path
import uuid
import review_queue as q

ROOT = Path(__file__).resolve().parents[1]
REVIEWERS = ('codex', 'antigravity')


def records(root):
    return [json.loads(p.read_text()) for p in
            (root / 'coordination/reviews/peer').glob('*.json')]


def eligible(packet, reviewer):
    coordination_code = any(name.startswith('scripts/') and name.endswith('.py')
                            for name in packet['files'])
    return (reviewer in REVIEWERS and packet['agent'] != reviewer
            and packet['task'].startswith(('C', 'A', 'P', 'H'))
            and packet['task'] not in ('C04', 'A38')
            and (not packet['task'].startswith('COORD') or coordination_code))


def pending(root, reviewer):
    if reviewer not in REVIEWERS:
        raise ValueError('Only Codex and Antigravity are peer reviewers.')
    latest = {}
    for packet in sorted(q.packets(root), key=lambda p: p['created_at']):
        latest[(packet['agent'], packet['task'])] = packet
    reviewed = {(r['submission_id'], r['reviewer'], r['submission_sha256'])
                for r in records(root)}
    result = []
    for p in latest.values():
        if not eligible(p, reviewer) or p['completion'] != 'done' or q.stale(root, p):
            continue
        if (root / 'coordination/claims' / p['task']).exists():
            continue
        checksum = q.digest(root / 'coordination/reviews/submissions' / (p['id'] + '.json'))
        if (p['id'], reviewer, checksum) not in reviewed:
            result.append(p)
    return result


def review(root, ident, reviewer, decision, note, checks):
    q.safe_id(ident)
    path = root / 'coordination/reviews/submissions' / (ident + '.json')
    packet = json.loads(path.read_text())
    q.validate_record(root, packet)
    if packet['id'] != ident or not eligible(packet, reviewer):
        raise ValueError('Independent reviewer required; self-review is forbidden.')
    if decision not in ('approved', 'changes_requested') or not note.strip():
        raise ValueError('A decision and concrete review note are required.')
    if not checks or not all(c.strip() for c in checks):
        raise ValueError('Record actual checks or an explicit not-run limitation.')
    if (root / 'coordination/claims' / packet['task']).exists():
        raise ValueError('Producer scope is occupied; skip without waiting.')
    if decision == 'approved' and (packet['completion'] != 'done' or q.stale(root, packet)):
        raise ValueError('Approve only a complete current snapshot.')
    checksum = q.digest(path)
    record = dict(schema_version=1, submission_id=ident, reviewer=reviewer,
                  decision=decision, note=note, checks=checks, created_at=q.now(),
                  submission_sha256=checksum)
    # Recheck after reading evidence; concurrent edits invalidate approval.
    if decision == 'approved' and (q.stale(root, packet) or q.digest(path) != checksum):
        raise ValueError('Snapshot changed during review; request a fresh packet.')
    q.write_new(root / 'coordination/reviews/peer' /
                (ident + '--' + reviewer + '--' + uuid.uuid4().hex[:12] + '.json'), record)
    return record


def current(root, packet):
    checksum = q.digest(root / 'coordination/reviews/submissions' / (packet['id'] + '.json'))
    if q.stale(root, packet):
        return []
    latest = {}
    for record in records(root):
        if (record['submission_id'] == packet['id']
                and record['submission_sha256'] == checksum
                and eligible(packet, record['reviewer'])):
            old = latest.get(record['reviewer'])
            if old is None or record['created_at'] > old['created_at']:
                latest[record['reviewer']] = record
    return list(latest.values())


def joint_approved(root, packet):
    """Both reviewers must approve the same final candidate, not separate versions."""
    if packet['task'] != 'P57' or packet['agent'] != 'copilot' or packet['completion'] != 'done':
        return False
    approvals = {r['reviewer'] for r in current(root, packet) if r['decision'] == 'approved'}
    return approvals == set(REVIEWERS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    ls = sub.add_parser('list')
    ls.add_argument('--reviewer', choices=REVIEWERS, required=True)
    rev = sub.add_parser('review')
    rev.add_argument('id')
    rev.add_argument('--reviewer', choices=REVIEWERS, required=True)
    rev.add_argument('--decision', choices=('approved', 'changes_requested'), required=True)
    rev.add_argument('--note', required=True)
    rev.add_argument('--check', action='append', required=True)
    status = sub.add_parser('status')
    status.add_argument('id')
    args = parser.parse_args()
    try:
        if args.command == 'list':
            print(json.dumps([dict(id=p['id'], task=p['task'], agent=p['agent'],
                                   files=p['files']) for p in pending(ROOT, args.reviewer)], indent=2))
        elif args.command == 'status':
            q.safe_id(args.id)
            path = ROOT / 'coordination/reviews/submissions' / (args.id + '.json')
            packet = json.loads(path.read_text())
            q.validate_record(ROOT, packet)
            print(json.dumps(dict(submission_id=args.id, reviews=current(ROOT, packet),
                                  joint_candidate_approved=joint_approved(ROOT, packet)), indent=2))
        else:
            print(json.dumps(review(ROOT, args.id, args.reviewer, args.decision,
                                    args.note, args.check), indent=2))
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, str(error) + '\n')


if __name__ == '__main__':
    main()
