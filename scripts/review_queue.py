#!/usr/bin/env python3
"""Publish immutable completion packets and generate Codex's review inbox."""
import argparse
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import uuid
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
AGENTS = ('codex', 'antigravity', 'copilot')


def now():
    return datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')).isoformat(timespec='microseconds')


def safe_id(value):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,160}', value):
        raise ValueError('Use a simple ID without slashes, whitespace or traversal.')
    return value


def relative_file(root, name):
    path = Path(name)
    if path.is_absolute() or '..' in path.parts or not path.parts:
        raise ValueError('File paths must be relative to the repository.')
    resolved = (root / path).resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError('File path escapes repository through a symlink.')
    return resolved


def digest(path):
    if not path.exists():
        return None  # A deleted file is also part of a change snapshot.
    if not path.is_file():
        raise ValueError('List individual changed files, not directories.')
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile('w', dir=path.parent, prefix='.packet-', suffix='.tmp', delete=False) as out:
            temporary = out.name
            json.dump(data, out, indent=2, ensure_ascii=False)
            out.write('\n')
        # Publish a fully written inode without replacing an existing packet.
        os.link(temporary, path)
    finally:
        if temporary is not None:
            Path(temporary).unlink(missing_ok=True)


def submit(root, *, agent, task, request, summary, status, files, checks, risks):
    safe_id(task)
    safe_id(request)
    if agent not in AGENTS or status not in ('done', 'partial', 'blocked'):
        raise ValueError('Invalid agent or completion status.')
    if not summary.strip() or not checks or not all(s.strip() for s in checks):
        raise ValueError('A summary and actual checks (or explicit not-run reason) are required.')
    stamp = now()
    ident = datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')).strftime('%Y%m%dT%H%M%S') + '-' + agent + '-' + task + '-' + uuid.uuid4().hex[:8]
    hashes = {name: digest(relative_file(root, name)) for name in dict.fromkeys(files)}
    record = {'schema_version': 1, 'id': ident, 'created_at': stamp, 'agent': agent,
              'request': request, 'task': task, 'completion': status, 'summary': summary,
              'files': list(hashes), 'file_sha256': hashes, 'checks': checks, 'risks': risks,
              'review': 'pending'}
    write_new(root / 'coordination/reviews/submissions' / (ident + '.json'), record)
    return record


def validate_record(root, packet):
    if packet.get('schema_version') != 1 or packet.get('agent') not in AGENTS:
        raise ValueError('Invalid packet schema/agent.')
    for key in ('id', 'task', 'request'):
        safe_id(packet[key])
    if packet.get('completion') not in ('done', 'partial', 'blocked') or packet.get('review') != 'pending':
        raise ValueError('Invalid completion/review fields; decisions belong in separate files.')
    if not packet.get('summary') or not packet.get('checks'):
        raise ValueError('Missing summary/checks.')
    if set(packet['files']) != set(packet['file_sha256']):
        raise ValueError('File hashes do not match the declared files.')
    for name, checksum in packet['file_sha256'].items():
        relative_file(root, name)
        if checksum is not None and not re.fullmatch('[0-9a-f]{64}', checksum):
            raise ValueError('Invalid file hash.')


def stale(root, packet):
    return any(digest(relative_file(root, name)) != checksum for name, checksum in packet['file_sha256'].items())


def packets(root):
    result = []
    for path in sorted((root / 'coordination/reviews/submissions').glob('*.json')):
        packet = json.loads(path.read_text())
        validate_record(root, packet)
        if path.stem != packet['id']:
            raise ValueError('Packet filename does not match its ID.')
        result.append(packet)
    return result


def review(root, ident, decision, note):
    safe_id(ident)
    packet = json.loads((root / 'coordination/reviews/submissions' / (ident + '.json')).read_text())
    validate_record(root, packet)
    if decision not in ('approved', 'changes_requested') or not note.strip():
        raise ValueError('Supply a review decision and a concrete review note.')
    if decision == 'approved' and packet['agent'] == 'codex':
        raise ValueError('Codex cannot approve its own packet; use an independent Antigravity peer review.')
    if decision == 'approved' and stale(root, packet):
        raise ValueError('Files changed since submission; review a fresh completion packet.')
    record = {'submission_id': ident, 'reviewer': 'codex', 'created_at': now(),
              'decision': decision, 'note': note,
              'submission_sha256': digest(root / 'coordination/reviews/submissions' / (ident + '.json'))}
    name = ident + '--' + datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')).strftime('%Y%m%dT%H%M%S') + '-' + uuid.uuid4().hex[:8] + '.json'
    write_new(root / 'coordination/reviews/decisions' / name, record)
    return record


def md(value):
    return str(value).replace('\n', ' ').replace('|', '\\|').replace('[', '\\[').replace(']', '\\]')


def build_index(root):
    decisions = {}
    records = [json.loads(path.read_text()) for path in (root / 'coordination/reviews/decisions').glob('*.json')]
    for d in sorted(records, key=lambda record: record['created_at']):
        decisions[d['submission_id']] = d
    lines = ['# Codex review inbox', '', 'Generated by `rtk proxy python3 scripts/review_queue.py index`. '
             'Immutable submission files are authoritative; Codex records legacy integration decisions. '
             'Independent Codex/Antigravity peer reviews appear below.', '',
             '| Submission | Agent / task | Completion | Review | Summary |', '| --- | --- | --- | --- | --- |']
    for p in packets(root):
        decision = decisions.get(p['id'])
        state = 'STALE' if stale(root, p) else decision['decision'].upper() if decision else 'PENDING'
        if decision:
            current_hash = digest(root / 'coordination/reviews/submissions' / (p['id'] + '.json'))
            if decision.get('submission_sha256') != current_hash:
                state = 'INVALID_DECISION'
        lines.append(f'| [{p["id"]}](submissions/{p["id"]}.json) | {p["agent"]} / {p["task"]} | {p["completion"]} | {state} | {md(p["summary"])} |')
    if not packets(root):
        lines += ['', 'No completion packets yet. Legacy investigation handoffs remain linked from `coordination/BOARD.md`.']
    lines += ['', 'A DONE packet is not a Codex approval. STALE means one of its declared files changed after submission.', '']
    peer_records = {}
    for path in (root / 'coordination/reviews/peer').glob('*.json'):
        record = json.loads(path.read_text())
        key = (record['submission_id'], record['reviewer'])
        old = peer_records.get(key)
        if old is None or record['created_at'] > old[1]['created_at']:
            peer_records[key] = (path, record)
    lines += ['## Independent peer reviews', '',
              'Codex and Antigravity publish non-self reviews through `scripts/peer_review.py`. '
              'Final candidate P57 requires both reviewers on the same unchanged packet. '
              'See [delivery rules](../DELIVERY-PLAN.md).', '',
              '| Submission | Reviewer | Current decision | Note |',
              '| --- | --- | --- | --- |']
    by_id = {p['id']: p for p in packets(root)}
    for key, (path, record) in sorted(peer_records.items()):
        packet = by_id.get(record['submission_id'])
        checksum = digest(root / 'coordination/reviews/submissions' / (record['submission_id'] + '.json'))
        state = ('STALE' if not packet or stale(root, packet)
                 or record['submission_sha256'] != checksum else record['decision'].upper())
        lines.append(f'| [{md(record["submission_id"])}](peer/{path.name}) | '
                     f'{md(record["reviewer"])} | {state} | {md(record["note"])} |')
    if not peer_records:
        lines += ['| No independent peer records yet | - | NOT_REVIEWED | No approval inferred |']
    lines += ['']
    legacy = sorted((root / 'coordination/handoffs').glob('*/*.md'))
    if legacy:
        lines += ['## Earlier investigation handoffs', '', 'These links preserve historical authorship/status; they are not new implementation approvals.', '',
                  '| Agent / handoff | Reported status |', '| --- | --- |']
        for handoff in legacy:
            match = re.search(r'^Status:\s*(.+)$', handoff.read_text(), re.MULTILINE)
            label = handoff.parent.name + ' / ' + handoff.stem
            link = '../handoffs/' + handoff.parent.name + '/' + handoff.name
            lines.append(f'| [{md(label)}]({link}) | {md(match.group(1) if match else "See handoff")} |')
        lines += ['']
    dest = root / 'coordination/reviews/INDEX.md'
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', dir=dest.parent, delete=False) as out:
        out.write('\n'.join(lines))
        temporary = out.name
    os.replace(temporary, dest)
    return dest


def claim(root, agent, task, request):
    safe_id(task)
    safe_id(request)
    p = root / 'coordination/claims' / task
    p.parent.mkdir(parents=True, exist_ok=True)
    p.mkdir()  # Atomic acquisition; never remove another agent's existing claim.
    write_new(p / 'owner.json', {'agent': agent, 'task': task, 'request': request, 'started_at': now()})
    (p / 'owner.md').write_text(f'# {task} claim\n\nAgent: {agent}\nRequest: {request}\nScope: see coordination/BUILD-QUEUE.md\n')
    return p


def release(root, agent, task):
    safe_id(task)
    p = root / 'coordination/claims' / task
    if json.loads((p / 'owner.json').read_text())['agent'] != agent:
        raise ValueError('Only the recorded owner may release this claim.')
    (p / 'owner.json').unlink()
    (p / 'owner.md').unlink()
    p.rmdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest='command', required=True)
    p = subs.add_parser('submit')
    for key in ('agent', 'task', 'request', 'summary'):
        p.add_argument('--' + key, required=True, choices=AGENTS if key == 'agent' else None)
    p.add_argument('--status', choices=('done', 'partial', 'blocked'), required=True)
    p.add_argument('--file', action='append', default=[])
    p.add_argument('--check', action='append', required=True)
    p.add_argument('--risk', action='append', default=[])
    p = subs.add_parser('review')
    p.add_argument('id')
    p.add_argument('--decision', choices=('approved', 'changes_requested'), required=True)
    p.add_argument('--note', required=True)
    for command in ('claim', 'release'):
        p = subs.add_parser(command)
        p.add_argument('--agent', choices=AGENTS, required=True)
        p.add_argument('--task', required=True)
        if command == 'claim':
            p.add_argument('--request', required=True)
    subs.add_parser('index')
    subs.add_parser('validate')
    a = parser.parse_args()
    try:
        if a.command == 'submit':
            p = submit(ROOT, agent=a.agent, task=a.task, request=a.request, summary=a.summary, status=a.status,
                       files=a.file, checks=a.check, risks=a.risk)
            print('Submitted for Codex review:', p['id'])
        elif a.command == 'review':
            review(ROOT, a.id, a.decision, a.note)
            print('Codex review recorded:', a.id)
        elif a.command == 'index':
            print(build_index(ROOT))
        elif a.command == 'validate':
            print('Valid completion packets:', len(packets(ROOT)))
        elif a.command == 'claim':
            print(claim(ROOT, a.agent, a.task, a.request))
        elif a.command == 'release':
            release(ROOT, a.agent, a.task)
            print('Released own claim:', a.task)
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
