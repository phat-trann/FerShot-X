import base64,copy,unittest
from verify_update_manifest import normalize_asset_urls,verify
REPO="owner/app"
TAG="v1.1.1"
PUBLIC=f"https://github.com/{REPO}/releases/download/{TAG}/FerShot.X.app.tar.gz"
API=f"https://api.github.com/repos/{REPO}/releases/assets/123"
class ManifestTests(unittest.TestCase):
 def fixture(self):
  item={"url":API,"signature":base64.b64encode(b"synthetic-public-signature").decode()}
  return {"version":"1.1.1","platforms":{t:copy.deepcopy(item) for t in ["darwin-aarch64","darwin-x86_64","darwin-universal"]}},{"tag_name":TAG,"assets":[{"id":123,"name":"FerShot.X.app.tar.gz","browser_download_url":PUBLIC}]}
 def test_action_api_urls_resolve_to_exact_release_asset_and_keep_signatures(self):
  value,meta=self.fixture();before=value["platforms"]["darwin-aarch64"]["signature"];normalize_asset_urls(value,meta,TAG,REPO);self.assertTrue(verify(value,TAG,REPO));self.assertTrue(all(x["url"]==PUBLIC for x in value["platforms"].values()));self.assertEqual(before,value["platforms"]["darwin-aarch64"]["signature"])
 def test_unknown_ids_queries_and_foreign_api_are_rejected(self):
  for url in [API+"1",API+"?token=bad",API.replace("owner/app","other/app"),"https://evil.invalid/file.app.tar.gz"]:
   value,meta=self.fixture();value["platforms"]["darwin-aarch64"]["url"]=url
   with self.assertRaises(ValueError):normalize_asset_urls(value,meta,TAG,REPO)
 def test_mismatched_metadata_tag_is_rejected(self):
  value,meta=self.fixture();meta["tag_name"]="v1.0.0"
  with self.assertRaises(ValueError):normalize_asset_urls(value,meta,TAG,REPO)
 def test_unsafe_or_non_archive_asset_names_are_rejected(self):
  for name in ["../file.app.tar.gz","file.zip","nested/file.app.tar.gz"]:
   value,meta=self.fixture();meta["assets"][0]["name"]=name
   with self.assertRaises(ValueError):normalize_asset_urls(value,meta,TAG,REPO)
 def test_draft_untagged_download_url_does_not_leak_into_public_manifest(self):
  value,meta=self.fixture();meta["assets"][0]["browser_download_url"]="https://github.com/owner/app/releases/download/untagged-123/FerShot.X.app.tar.gz"
  normalize_asset_urls(value,meta,TAG,REPO);self.assertEqual(value["platforms"]["darwin-aarch64"]["url"],PUBLIC)
 def test_public_urls_are_already_valid(self):
  value,meta=self.fixture()
  for item in value["platforms"].values():item["url"]=PUBLIC
  self.assertTrue(verify(normalize_asset_urls(value,meta,TAG,REPO),TAG,REPO))
 def test_unsigned_or_wrong_version_manifest_cannot_pass(self):
  for field,bad in [("version","1.0.0"),("signature","")]:
   value,meta=self.fixture();normalize_asset_urls(value,meta,TAG,REPO)
   if field=="version":value[field]=bad
   else:value["platforms"]["darwin-aarch64"][field]=bad
   with self.assertRaises(ValueError):verify(value,TAG,REPO)
 def test_split_release_requires_two_distinct_archives_and_consistent_aliases(self):
  value,meta=self.fixture();normalize_asset_urls(value,meta,TAG,REPO)
  with self.assertRaises(ValueError):verify(value,TAG,REPO,True)
  value["platforms"].pop("darwin-universal")
  with self.assertRaises(ValueError):verify(value,TAG,REPO,True)
  value["platforms"]["darwin-x86_64"]["url"]=PUBLIC.replace("FerShot.X", "FerShot.X.Intel")
  for target in ["darwin-aarch64","darwin-x86_64"]:value["platforms"][target+"-app"]=copy.deepcopy(value["platforms"][target])
  self.assertTrue(verify(value,TAG,REPO,True))
  value["platforms"]["darwin-aarch64-app"]["url"]=value["platforms"]["darwin-x86_64"]["url"]
  with self.assertRaises(ValueError):verify(value,TAG,REPO,True)
 def test_missing_split_target_is_rejected(self):
  value,meta=self.fixture();normalize_asset_urls(value,meta,TAG,REPO);value["platforms"].pop("darwin-x86_64")
  with self.assertRaises(ValueError):verify(value,TAG,REPO,True)
if __name__=="__main__":unittest.main()
