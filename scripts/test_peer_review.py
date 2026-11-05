import tempfile
from pathlib import Path
import unittest
import peer_review as peer
import review_queue as q


class PeerReviewTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        (self.root / 'module.ts').write_text('original')
        self.packet = q.submit(self.root, agent='codex', task='C17', request='TEST',
                               summary='fixture', status='done', files=['module.ts'],
                               checks=['synthetic check'], risks=[])

    def record(self, reviewer='antigravity', decision='approved'):
        return peer.review(self.root, self.packet['id'], reviewer, decision,
                           'Inspected fixture source', ['Synthetic functional check'])

    def test_self_approval_is_rejected(self):
        with self.assertRaises(ValueError):
            self.record('codex')
        with self.assertRaises(ValueError):
            q.review(self.root, self.packet['id'], 'approved', 'Self approval is forbidden')

    def test_review_is_hash_bound_and_immutable(self):
        original = (self.root / 'coordination/reviews/submissions' /
                    (self.packet['id'] + '.json')).read_bytes()
        self.assertEqual(len(peer.pending(self.root, 'antigravity')), 1)
        self.record()
        self.assertFalse(peer.pending(self.root, 'antigravity'))
        self.assertEqual(peer.current(self.root, self.packet)[0]['decision'], 'approved')
        (self.root / 'module.ts').write_text('changed')
        self.assertFalse(peer.current(self.root, self.packet))
        with self.assertRaises(ValueError):
            self.record()
        self.assertEqual(original, (self.root / 'coordination/reviews/submissions' /
                                   (self.packet['id'] + '.json')).read_bytes())

    def test_latest_rejection_overrides_previous_approval(self):
        self.record()
        self.record(decision='changes_requested')
        self.assertEqual(peer.current(self.root, self.packet)[0]['decision'], 'changes_requested')

    def test_active_producer_is_skipped(self):
        q.claim(self.root, 'codex', 'C17', 'TEST')
        self.assertFalse(peer.pending(self.root, 'antigravity'))
        with self.assertRaises(ValueError):
            self.record()

    def test_review_reports_do_not_spawn_recursive_review_work(self):
        q.submit(self.root, agent='codex', task='C04', request='TEST',
                 summary='review batch', status='done', files=['module.ts'],
                 checks=['synthetic'], risks=[])
        q.submit(self.root, agent='antigravity', task='A38', request='TEST',
                 summary='peer review batch', status='done', files=['module.ts'],
                 checks=['synthetic'], risks=[])
        self.assertEqual([p['task'] for p in peer.pending(self.root, 'antigravity')], ['C17'])
        self.assertFalse(peer.pending(self.root, 'codex'))

    def test_coordination_code_is_reviewable_but_report_only_work_is_not(self):
        (self.root / 'scripts').mkdir()
        (self.root / 'scripts/helper.py').write_text('pass')
        q.submit(self.root, agent='codex', task='COORD08', request='TEST',
                 summary='helper implementation', status='done', files=['scripts/helper.py'],
                 checks=['synthetic'], risks=[])
        q.submit(self.root, agent='codex', task='COORD07', request='TEST',
                 summary='allocation report', status='done', files=['module.ts'],
                 checks=['synthetic'], risks=[])
        tasks = [p['task'] for p in peer.pending(self.root, 'antigravity')]
        self.assertIn('COORD08', tasks)
        self.assertNotIn('COORD07', tasks)

    def test_new_packet_requires_a_fresh_review(self):
        self.record()
        fresh = q.submit(self.root, agent='codex', task='C17', request='TEST',
                          summary='new snapshot', status='done', files=['module.ts'],
                          checks=['synthetic check'], risks=[])
        self.assertEqual([p['id'] for p in peer.pending(self.root, 'antigravity')], [fresh['id']])

    def test_joint_gate_requires_both_reviewers_on_same_current_candidate(self):
        candidate = q.submit(self.root, agent='copilot', task='P57', request='TEST',
                              summary='candidate', status='done', files=['module.ts'],
                              checks=['synthetic'], risks=[])
        peer.review(self.root, candidate['id'], 'codex', 'approved', 'Checked candidate', ['synthetic'])
        self.assertFalse(peer.joint_approved(self.root, candidate))
        peer.review(self.root, candidate['id'], 'antigravity', 'approved', 'Checked candidate', ['synthetic'])
        self.assertTrue(peer.joint_approved(self.root, candidate))
        (self.root / 'module.ts').write_text('changed after signoff')
        self.assertFalse(peer.joint_approved(self.root, candidate))


if __name__ == '__main__':
    unittest.main()
