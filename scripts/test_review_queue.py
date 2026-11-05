import concurrent.futures
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import threading

import review_queue as queue


class ReviewQueueTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'feature.ts').write_text('export const value = 1;\n')

    def submit(self, agent='copilot'):
        return queue.submit(self.root, agent=agent, task='P01', request='BUILD-20261105',
                            summary='Bounded feature | reviewed later', status='done',
                            files=['feature.ts'], checks=['Unit test passed'], risks=[])

    def test_parallel_agents_keep_every_completion_packet(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            results = list(pool.map(self.submit, queue.AGENTS))
        self.assertEqual(3, len({p['id'] for p in results}))
        self.assertEqual(3, len(queue.packets(self.root)))
        text = queue.build_index(self.root).read_text()
        for p in results:
            self.assertIn(p['id'], text)

    def test_reader_never_sees_a_partially_written_packet(self):
        entered, proceed = threading.Event(), threading.Event()
        original_dump = queue.json.dump
        def delayed_dump(*args, **kwargs):
            entered.set()
            if not proceed.wait(timeout=5):
                raise TimeoutError('Test writer was not released')
            original_dump(*args, **kwargs)
        with patch.object(queue.json, 'dump', side_effect=delayed_dump):
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(self.submit)
                try:
                    self.assertTrue(entered.wait(timeout=5))
                    self.assertEqual([], queue.packets(self.root))
                finally:
                    proceed.set()
                future.result()
        self.assertEqual(1, len(queue.packets(self.root)))

    def test_done_is_pending_until_review_and_changed_code_cannot_be_approved(self):
        p = self.submit()
        self.assertIn('PENDING', queue.build_index(self.root).read_text())
        queue.review(self.root, p['id'], 'approved', 'Read code and checked tests')
        self.assertIn('APPROVED', queue.build_index(self.root).read_text())
        (self.root / 'feature.ts').write_text('changed after review')
        self.assertIn('STALE', queue.build_index(self.root).read_text())
        with self.assertRaises(ValueError):
            queue.review(self.root, p['id'], 'approved', 'Cannot approve a different snapshot')

    def test_claim_is_exclusive_and_other_agent_cannot_release(self):
        queue.claim(self.root, 'codex', 'C01', 'BUILD-20261105')
        with self.assertRaises(FileExistsError):
            queue.claim(self.root, 'antigravity', 'C01', 'BUILD-20261105')
        with self.assertRaises(ValueError):
            queue.release(self.root, 'antigravity', 'C01')
        queue.release(self.root, 'codex', 'C01')
        self.assertFalse((self.root / 'coordination/claims/C01').exists())

    def test_submission_rejects_paths_outside_repo(self):
        with self.assertRaises(ValueError):
            queue.relative_file(self.root, '../private-file')
        (self.root / 'outside').symlink_to(self.root.parent)
        with self.assertRaises(ValueError):
            queue.relative_file(self.root, 'outside/private-file')


if __name__ == '__main__':
    unittest.main()
