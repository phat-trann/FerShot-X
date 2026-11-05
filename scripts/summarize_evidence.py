#!/usr/bin/env python3
"""Project REA observations into a reviewable index; do not infer runtime behavior."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT_FIELDS = {'NSDev', 'NSTitle', 'NS.string', 'NSContents', 'NSPlaceholderString', 'NSToolTip', 'NSAlternateTitle'}


def main():
    (ROOT / 'docs').mkdir(exist_ok=True)
    raw = ROOT / 'evidence/raw'
    ib_path = raw / 'interface-builder.json'
    evidence = json.loads(ib_path.read_text())
    result = evidence['normalized_result']
    documents = []
    for index, doc in enumerate(result['documents'], 1):
        path = doc['relative_path']
        labels, actions = [], []
        for node in result['graph']['nodes']:
            if not any(e.get('artifact_path') == path for e in node.get('evidence', [])):
                continue
            attrs = node.get('attributes', {})
            for key, value in attrs.get('nibValues', {}).items():
                if key in TEXT_FIELDS and isinstance(value, str) and value.strip():
                    labels.append({'text': value, 'field': key, 'node_id': node['id']})
            if node['kind'] == 'action':
                actions.append({'selector': attrs.get('selector', node['name']), 'source_id': attrs.get('source_id'), 'destination_id': attrs.get('destination_id'), 'node_id': node['id']})
        documents.append({'id': f'UI-{index:02}', **doc, 'labels': labels, 'actions': actions})
    inventory = {
        'source': 'REA decode_interface_builder output; deterministic projection of recognized text fields and action nodes',
        'evidence_id': evidence['evidence_id'],
        'raw_file': 'evidence/raw/interface-builder.json',
        'raw_file_sha256': hashlib.sha256(ib_path.read_bytes()).hexdigest(),
        'resource_root': result['resource_root'],
        'executable_sha256_in_resource_evidence': result['target_sha256'],
        'graph_truncated': result['graph']['truncated'],
        'coverage': result['graph']['coverage'],
        'limitations': evidence['limitations'],
        'documents': documents,
    }
    (ROOT / 'evidence/ui-signals.json').write_text(json.dumps(inventory, indent=2, ensure_ascii=False) + '\n')
    macho = json.loads((raw / 'macho.json').read_text())
    mr = macho['normalized_result']
    native = {key: mr[key] for key in ['format', 'selected_architecture', 'uuid', 'architectures', 'build_metadata', 'dependencies', 'limitations'] if key in mr}
    native['evidence_id'] = macho['evidence_id']
    native['raw_file_sha256'] = hashlib.sha256((raw / 'macho.json').read_bytes()).hexdigest()
    (ROOT / 'evidence/native-summary.json').write_text(json.dumps(native, indent=2) + '\n')
    # A bounded source pack keeps the small Copilot task out of the full graph.
    target = json.loads((ROOT / 'evidence/target.json').read_text())
    plist = json.loads((raw / 'plist.json').read_text())
    selection = {
        'UI-02': ({'Open File', 'Open From Clipboard', 'Copy Image', 'Save Image', 'Save Image As', 'Print'},
                  {'menuOpenFile:', 'menuOpenFromClipboard:', 'menuCopy:', 'menuSave:', 'menuSaveAs:', 'menuPrint:'}),
        'UI-12': ({'URL Scheme API', 'Enable deep links'}, {'updateDeeplinks:'}),
        'UI-15': ({'Screenshots folder', 'Auto (PNG/JPEG)', 'Save format', 'Resize retina screenshots',
                   'Downscale to 1× when saving', 'PNG', 'Select Folder'},
                  {'changeSaveFormat:', 'changeDownscale:', 'clickSaveFolder:'}),
    }
    excerpts = []
    for doc in documents:
        if doc['id'] not in selection:
            continue
        labels, selectors = selection[doc['id']]
        excerpts.append({
            'id': doc['id'], 'resource_path': doc['relative_path'], 'archive_sha256': doc['archive_sha256'],
            'labels': [{'text': item['text'], 'field': item['field'],
                        'object_id': json.loads(item['node_id'].split(':object:', 1)[1])[0]}
                       for item in doc['labels'] if item['text'] in labels],
            'actions': [{'selector': item['selector'], 'source_object_id': item['source_id']}
                        for item in doc['actions'] if item['selector'] in selectors],
        })
    value = plist['normalized_result']['value']
    brief = {
        'kind': 'selected-observations; not complete REA Evidence',
        'feature_ids': ['F05', 'F24', 'F25', 'F32'],
        'target': {key: target[key] for key in ['app_path', 'version', 'build', 'bundle_id', 'executable_sha256']},
        'source_evidence_ids': {'plist': plist['evidence_id'], 'interface_builder': evidence['evidence_id']},
        'source_projection': 'evidence/ui-signals.json',
        'source_projection_sha256': hashlib.sha256((ROOT / 'evidence/ui-signals.json').read_bytes()).hexdigest(),
        'plist_observations': {key: value[key] for key in ['CFBundleDocumentTypes', 'CFBundleURLTypes']},
        'ui_observations': excerpts,
        'limitations': ['Selected static declarations only; no runtime verification.',
                        'UI labels/actions do not prove enabled state, implementation or successful behavior.',
                        'Full source graph reports partial connections/hierarchy and truncation.',
                        'Resource Evidence has null executable identity; executable hash is separate collection metadata.',
                        'No supported deep-link commands or animated-GIF behavior established.'],
    }
    (ROOT / 'evidence/briefs').mkdir(exist_ok=True)
    (ROOT / 'evidence/briefs/copilot-export.json').write_text(json.dumps(brief, indent=2, ensure_ascii=False) + '\n')
    lines = ['# Interface Builder observations', '', 'Generated by `scripts/summarize_evidence.py` from local REA output.', '',
             f'REA Evidence: `{evidence["evidence_id"]}`.', '',
             'These are archived labels and target-action connections, not proof that a control is visible, enabled, or implemented at runtime.', '',
             'The graph reports truncation, partial connection coverage and partial hierarchy projection. Preserve the coverage and limitations in `evidence/ui-signals.json`; this is not a complete product specification.', '']
    for doc in documents:
        lines += [f'## {doc["id"]}', '', f'Path: `{doc["relative_path"]}`', '', f'Archive SHA-256: `{doc["archive_sha256"]}`', '', '**Labels**', '']
        texts = list(dict.fromkeys(item['text'] for item in doc['labels']))
        lines += ['- ' + json.dumps(text, ensure_ascii=False) for text in texts] or ['No recognized text fields.']
        lines += ['', '**Actions**', '']
        selectors = list(dict.fromkeys(item['selector'] for item in doc['actions']))
        lines += ['- `' + item + '`' for item in selectors] or ['No recognized action nodes.']
        lines += ['']
    (ROOT / 'docs/ui-inventory.md').write_text('\n'.join(lines) + '\n')
    print(f'Indexed {len(documents)} documents, {sum(len(d["labels"]) for d in documents)} text observations, {sum(len(d["actions"]) for d in documents)} actions.')


if __name__ == '__main__':
    main()
