"""User-authorized review credit, distinct from independent peer approval."""
import json


def codex_review_credit(root, packet):
    path = root / 'coordination/reviews/policy.json'
    if not path.is_file() or packet.get('agent') != 'codex':
        return False
    policy = json.loads(path.read_text())
    return (policy.get('schema_version') == 1
            and policy.get('authorized_by') == 'user'
            and policy.get('codex_review_state') == 'USER_WAIVED_REVIEW'
            and policy.get('counts_as_reviewed') is True
            and policy.get('overall_review_required') is True)
