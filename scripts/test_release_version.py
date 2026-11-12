import unittest
from release_version import plan,version
class ReleaseVersionTests(unittest.TestCase):
    def test_patch_minor_major_bumps_release(self):
        for old,new in [("1.1.0","1.1.1"),("1.1.9","1.2.0"),("1.9.9","2.0.0"),("1.9.0","1.10.0")]:self.assertTrue(plan("push","refs/heads/main",new,old)[0])
    def test_unchanged_and_decreased_versions_skip(self):
        for old,new in [("1.1.0","1.1.0"),("1.2.0","1.1.9")]:self.assertFalse(plan("push","refs/heads/main",new,old)[0])
    def test_initial_main_release(self):self.assertTrue(plan("push","refs/heads/main","1.1.0")[0])
    def test_other_branches_never_publish(self):
        for event in ["push","workflow_dispatch"]:self.assertFalse(plan(event,"refs/heads/feature","1.2.0","1.1.0")[0])
    def test_manual_retry_on_main(self):self.assertTrue(plan("workflow_dispatch","refs/heads/main","1.1.0")[0])
    def test_pipeline_repair_retries_unpublished_same_version(self):self.assertTrue(plan("push","refs/heads/main","1.1.0","1.1.0",True)[0])
    def test_pipeline_repair_never_allows_a_decrease_or_other_branch(self):
        self.assertFalse(plan("push","refs/heads/main","1.1.0","1.2.0",True)[0])
        self.assertFalse(plan("push","refs/heads/feature","1.1.0","1.1.0",True)[0])
    def test_invalid_versions_fail_closed(self):
        for value in ["01.1.0","1.2","1.2.3-beta",None,"1.2.3\nsecret"]:
            with self.assertRaises(ValueError):version(value)
if __name__=="__main__":unittest.main()
