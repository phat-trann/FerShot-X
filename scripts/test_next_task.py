import json
from pathlib import Path
import tempfile
import unittest
import next_task as dispatcher
import review_queue as q
import peer_review as peer


class NextTaskTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "coordination").mkdir()
        (self.root / "module.ts").write_text("original")
        self.tasks = [{"id": "P01", "agent": "copilot", "state": "READY"}, {"id": "P02", "agent": "copilot", "state": "READY"}]
        self.save()

    def save(self):
        (self.root / "coordination/build-tasks.json").write_text(json.dumps({"request": "TEST", "tasks": self.tasks}))

    def packet(self, task="P01", status="done"):
        return q.submit(self.root, agent="copilot", task=task, request="TEST", status=status,
                        summary="fixture", files=["module.ts"], checks=["synthetic"], risks=[])

    def test_current_submission_skipped_and_newer_fix_packet_supersedes_review(self):
        first = self.packet()
        self.assertEqual(dispatcher.choose(self.root, "copilot")["next"]["task"]["id"], "P02")
        q.review(self.root, first["id"], "changes_requested", "fix actual defect")
        self.assertEqual(dispatcher.choose(self.root, "copilot")["next"]["action"], "fix_review")
        self.packet()
        self.assertEqual(dispatcher.choose(self.root, "copilot")["next"]["task"]["id"], "P02")

    def test_deferred_pending_packet_keeps_codex_review_available(self):
        worker = self.packet()
        self.tasks = [{"id": "C04", "agent": "codex", "state": "PARTIAL"}]
        self.save()
        q.submit(self.root, agent="codex", task="C04", request="TEST", status="partial",
                 summary="deferred while allocating work", files=["module.ts"], checks=["synthetic"], risks=[])
        self.assertEqual(dispatcher.choose(self.root, "codex")["next"]["action"], "review_new_packets")
        q.review(self.root, worker["id"], "approved", "reviewed synthetic packet")
        self.assertIsNone(dispatcher.choose(self.root, "codex")["next"])

    def test_superseded_task_is_not_dispatched_even_after_review_request(self):
        first = self.packet()
        q.review(self.root, first["id"], "changes_requested", "old architecture feedback")
        self.tasks[0]["superseded_by"] = "P02"
        self.tasks[1]["queue_priority"] = 1
        self.save()
        result = dispatcher.choose(self.root, "copilot")
        self.assertEqual(result["next"]["task"]["id"], "P02")
        self.assertEqual(result["skipped"][0]["reason"], "superseded")

    def test_partial_integration_resumes_after_current_input_is_approved(self):
        producer = q.submit(self.root, agent="antigravity", task="A33", request="TEST", status="done",
                            summary="Rust core", files=["module.ts"], checks=["synthetic"], risks=[])
        self.tasks = [{"id": "C08", "agent": "codex", "state": "PARTIAL", "requires_reviewed_tasks": ["A33"]}]
        self.save()
        q.submit(self.root, agent="codex", task="C08", request="TEST", status="partial",
                 summary="waiting for source review", files=["module.ts"], checks=["synthetic"], risks=[])
        self.assertIsNone(dispatcher.choose(self.root, "codex")["next"])
        q.review(self.root, producer["id"], "approved", "reviewed owned core")
        self.assertEqual(dispatcher.choose(self.root, "codex")["next"]["action"], "resume_reviewed_input")

    def test_stale_snapshot_selected_for_refresh(self):
        self.packet()
        (self.root / "module.ts").write_text("changed")
        self.assertEqual(dispatcher.choose(self.root, "copilot")["next"]["action"], "check_and_refresh_snapshot")

    def test_missing_dependency_and_claim_skipped_without_waiting(self):
        self.tasks[0]["requires"] = ["not-present"]
        self.save()
        q.claim(self.root, "antigravity", "P02", "TEST")
        self.assertIsNone(dispatcher.choose(self.root, "copilot")["next"])
        self.assertEqual(json.loads((self.root / "coordination/claims/P02/owner.json").read_text())["agent"], "antigravity")

    def test_claim_acquires_task_and_shared_scope(self):
        self.tasks[0]["shared_claim"] = "root-wiring"
        self.save()
        result = dispatcher.choose(self.root, "copilot", acquire=True)
        self.assertEqual(result["claimed"], ["root-wiring", "P01"])
        self.assertEqual(dispatcher.choose(self.root, "copilot")["next"]["task"]["id"], "P02")
        for ident in reversed(result["claimed"]):
            q.release(self.root, "copilot", ident)

    def test_blocked_packet_not_repeated_without_explicit_retry(self):
        self.packet(status="blocked")
        self.assertEqual(dispatcher.choose(self.root, "copilot")["next"]["task"]["id"], "P02")
        self.tasks[0]["state"] = "RETRY"
        self.save()
        self.assertEqual(dispatcher.choose(self.root, "copilot")["next"]["action"], "resume")

    def test_codex_implementation_precedes_review_backlog(self):
        self.packet()
        self.tasks = [{'id': 'C04', 'agent': 'codex', 'work_kind': 'review'},
                      {'id': 'C17', 'agent': 'codex', 'work_kind': 'implementation'}]
        self.save()
        self.assertEqual(dispatcher.choose(self.root, 'codex')['next']['task']['id'], 'C17')

    def test_recurring_peer_review_skips_empty_and_resumes_for_fresh_packet(self):
        self.tasks = [{'id': 'A38', 'agent': 'antigravity', 'work_kind': 'review',
                       'recurring_peer_review': True}]
        self.save()
        self.assertIsNone(dispatcher.choose(self.root, 'antigravity')['next'])
        p = q.submit(self.root, agent='codex', task='C17', request='TEST',
                     summary='fixture', status='done', files=['module.ts'], checks=['synthetic'], risks=[])
        self.assertEqual(dispatcher.choose(self.root, 'antigravity')['next']['task']['id'], 'A38')
        peer.review(self.root, p['id'], 'antigravity', 'approved', 'Inspected fixture', ['synthetic'])
        self.assertIsNone(dispatcher.choose(self.root, 'antigravity')['next'])

    def test_peer_requested_correction_reopens_producer(self):
        self.tasks = [{'id': 'C17', 'agent': 'codex', 'work_kind': 'implementation'}]
        self.save()
        p = q.submit(self.root, agent='codex', task='C17', request='TEST',
                     summary='fixture', status='done', files=['module.ts'], checks=['synthetic'], risks=[])
        peer.review(self.root, p['id'], 'antigravity', 'changes_requested', 'Fix actual defect', ['synthetic'])
        result = dispatcher.choose(self.root, 'codex')['next']
        self.assertEqual(result['action'], 'fix_review')
        self.assertEqual(result['review_note'], 'Fix actual defect')

    def test_codex_input_needs_independent_approval_before_integration(self):
        self.tasks = [{'id': 'C07', 'agent': 'codex', 'work_kind': 'integration',
                       'requires_reviewed_tasks': ['C17']}]
        self.save()
        p = q.submit(self.root, agent='codex', task='C17', request='TEST',
                     summary='fixture', status='done', files=['module.ts'], checks=['synthetic'], risks=[])
        self.assertIsNone(dispatcher.choose(self.root, 'codex')['next'])
        peer.review(self.root, p['id'], 'antigravity', 'approved', 'Checked source', ['synthetic'])
        self.assertEqual(dispatcher.choose(self.root, 'codex')['next']['task']['id'], 'C07')
        peer.review(self.root, p['id'], 'antigravity', 'changes_requested', 'Found defect', ['synthetic'])
        self.assertIsNone(dispatcher.choose(self.root, 'codex')['next'])


if __name__ == "__main__":
    unittest.main()
