#!/usr/bin/env python3
"""Project task-scoped controls and archive action wiring from saved REA Evidence.

This performs no REA recollection and does not open or execute Shottr.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASK_DOCUMENTS = {
    'T03': {'UI-02', 'UI-03', 'UI-05'},
    'T04': {'UI-06', 'UI-07', 'UI-08', 'UI-09', 'UI-15', 'UI-16', 'UI-17'},
    'T07': {'UI-04', 'UI-10', 'UI-11', 'UI-12', 'UI-13', 'UI-14', 'UI-15'},
}
RAW_PROPERTIES = {'NSKeyEquiv', 'NSKeyEquivModMask', 'NSKeyEquivalent', 'NSKeyEquivalentModifierMask',
                  'NSMinValue', 'NSMaxValue', 'NSValue', 'NSSelectedSegment', 'NSEnabled',
                  'NSHidden', 'NSHiddenInRepresentation', 'NSTag', 'NSMenuItemRespectAlignment'}
CHILD_KEYS = {'NSCell', 'NSContents', 'NSTitle', 'NSDev', 'NS.string', 'NSName', 'NSResourceName',
              'NSMenu', 'NSMenuItems', 'NS.objects', 'NSSegmentImages', 'NSLabel', 'NSSegmentItemLabel',
              'NSMenuItem', 'NSAccessibilityLabel', 'NSAlternateContents'}


def project(task, replace=False):
    raw_path = ROOT / 'evidence/raw/interface-builder.json'
    raw = json.loads(raw_path.read_text())
    index = json.loads((ROOT / 'evidence/ui-signals.json').read_text())
    target = json.loads((ROOT / 'evidence/target.json').read_text())
    current_hash = hashlib.sha256(Path(target['executable']).read_bytes()).hexdigest()
    if current_hash != target['executable_sha256']:
        raise SystemExit('Installed executable changed; do not project the old observations as current.')
    nodes = raw['normalized_result']['graph']['nodes']
    result = {'task': task, 'kind': 'projection of saved REA observations, not new canonical Evidence',
              'source_evidence_id': raw['evidence_id'], 'source_file': 'evidence/raw/interface-builder.json',
              'source_file_sha256': hashlib.sha256(raw_path.read_bytes()).hexdigest(),
              'target': {k: target[k] for k in ['app_path', 'version', 'build', 'executable_sha256']},
              'classification': 'STATIC_OBSERVED', 'runtime_status': 'UNKNOWN',
              'limitations': raw['limitations'] + [
                  'Resolved control text follows only selected explicit archive reference fields.',
                  'Archived slider values, flags and shortcut masks are serialized declarations, not runtime defaults or effective bindings.',
                  'External placeholders and null action targets remain unresolved; no implementation or responder-chain receiver is inferred.'],
              'documents': []}
    for doc in index['documents']:
        if doc['id'] not in TASK_DOCUMENTS[task]:
            continue
        path = doc['relative_path']
        selected = [n for n in nodes if any(e.get('artifact_path') == path for e in n.get('evidence', []))]
        objects = {n['attributes']['interface_builder_object_id']: n for n in selected
                   if 'interface_builder_object_id' in n.get('attributes', {})}

        def values(obj):
            return obj.get('attributes', {}).get('nibValues', {}) if obj else {}

        def walk(value, seen=None, depth=0):
            seen = set() if seen is None else seen
            if depth > 10:
                return []
            if isinstance(value, str):
                return [value] if value.strip() else []
            if isinstance(value, list):
                return [s for item in value for s in walk(item, seen, depth + 1)]
            if not isinstance(value, dict):
                return []
            oid = value.get('objectID')
            if oid:
                if oid in seen:
                    return []
                return walk(values(objects.get(oid)), seen | {oid}, depth + 1)
            return [s for key, item in value.items() if key in CHILD_KEYS for s in walk(item, seen, depth + 1)]

        def control(oid):
            node = objects.get(oid)
            if node is None:
                return None
            attrs = node.get('attributes', {})
            v = values(node)
            cell_id = v.get('NSCell', {}).get('objectID') if isinstance(v.get('NSCell'), dict) else None
            cell = objects.get(cell_id)
            return {'object_id': oid, 'class': attrs.get('class_name', node['name']),
                    'node_id': node['id'], 'text_or_resource_names': list(dict.fromkeys(walk(v))),
                    'archived_properties': {k: val for k, val in v.items() if k in RAW_PROPERTIES},
                    'cell_object_id': cell_id,
                    'archived_cell_properties': {k: val for k, val in values(cell).items() if k in RAW_PROPERTIES}}

        actions = []
        for a in doc['actions']:
            destination = objects.get(a['destination_id'])
            attrs = destination.get('attributes', {}) if destination else {}
            actions.append({'selector': a['selector'], 'action_node_id': a['node_id'],
                            'source': control(a['source_id']), 'destination_object_id': a['destination_id'],
                            'destination_archived_class': attrs.get('class_name'),
                            'destination_placeholder': values(destination).get('NSExternalObjectPlaceholderIdentifier')})
        result['documents'].append({
            'id': doc['id'], 'resource_path': path, 'archive_sha256': doc['archive_sha256'],
            'current_resource_sha256': hashlib.sha256((Path(target['app_path']) / path).read_bytes()).hexdigest(),
            'coverage': [c for c in index['coverage'] if path in c['facet']],
            'declared_classes': [{'object_id': oid, 'node_id': node['id'],
                                  'archived_class': values(node)['NSClassName'],
                                  'nib_name': values(node).get('NSNibName')}
                                 for oid, node in objects.items() if 'NSClassName' in values(node)],
            'labels': doc['labels'], 'actions': actions,
        })
    out = ROOT / 'evidence/agents/codex' / (task + '-static.json')
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists() and not replace:
        raise SystemExit(f'Refusing to replace existing task evidence: {out}')
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print(f'{task}: wrote {out.relative_to(ROOT)} from {len(result["documents"])} saved documents.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('task', choices=TASK_DOCUMENTS)
    parser.add_argument('--replace', action='store_true', help='Replace only this task projection after checking file ownership')
    args = parser.parse_args()
    project(args.task, args.replace)
