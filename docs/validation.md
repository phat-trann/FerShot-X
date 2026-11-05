# Phase 1 validation

Date: 2026-11-05, Asia/Ho_Chi_Minh.

| Check | Observed result |
| --- | --- |
| REA collection | `inspect-plist`, `decode-interface-builder`, `inspect-macho`: exit code 0; each returned JSON Evidence |
| Target identity | Version 1.9.3, build 137; rehashed installed executable matches `evidence/target.json` |
| Evidence references | Collection Evidence IDs match the saved raw records; Interface Builder raw-file SHA-256 matches its curated index |
| Generated inventory | 17 documents, 365 recognized text observations, 217 action nodes |
| Coverage | 60 complete facets, eight partial connection facets, one partial hierarchy facet; graph truncation retained |
| Feature IDs | F01-F34: 34 unique groups; all classified as static observations with runtime questions |
| Python | Both collection/projection scripts parse successfully; collector and summarizer executed |
| Generated projection | Summarizer rerun successfully after coverage wording correction |
| Documentation | Local Markdown file links and section anchors resolve; no trailing whitespace found |
| Git | New repository on `main`; no remote configured; no initial commit created |
| Ignore rules | `.vscode/settings.json`, raw REA JSON, capture paths, app-copy paths and local claims confirmed ignored with `git check-ignore` |
| Whitespace | `git diff --check` clean; since files are new/untracked, direct text whitespace validation also performed |

No runtime feature test, end-to-end capture, cloud request, native decompilation or application build was performed. The observed static collection success does not override REA's coverage limitations.
