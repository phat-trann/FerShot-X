# Codex kickoff validation

Date: 2026-11-05, Asia/Ho_Chi_Minh. These checks validate the investigation artifacts, not Shottr feature behavior.

| Check | Result |
| --- | --- |
| Target identity | Installed executable SHA-256 still matches the Shottr 1.9.3 build 137 record |
| T03/T04/T07 source identity | Projection source file hash and original REA Evidence ID match complete local Interface Builder JSON |
| Action provenance | Every projected action node/selector/destination matches the original REA graph; projected source nodes exist |
| Resource identity | Every selected archive's saved hash and reobserved current hash match the installed file |
| Declared classes | T04/T07 class records match the original REA node fields |
| Synthetic fixture | PNG CRCs, 640×400 header, SHA-256 and four known RGB probes validated by decoding the saved output |
| Scripts | New projector/fixture scripts parsed and executed successfully |
| Owned documentation | Local links/anchors and whitespace checks passed |
| Native handler trace | Actual exit code 1, provider_unavailable; preserved as a failed attempt, not successful Evidence |
| Runtime | No Codex runtime/clipboard/preference/cloud/license test performed; no RUNTIME_VERIFIED findings |
| External report issue | Copilot's evidence-pack relative link is unresolved; correction sent as a file-message without editing the author's report |
| Git whitespace | `git diff --check` passed; untracked/new owned reports were also checked directly |

Partial archive coverage and runtime unknowns remain explicit. No test suite, application build or native analysis engine was installed. Existing Git changes and other agents' files/claims were preserved.
