# C143 Release 1.2.1

User authorizes publication of C140–C142. Product versions synchronize to 1.2.1, with release notes covering bounded FTP preview caching, Library IO/render optimization, verified legacy cleanup, user documentation and separate Apple Silicon/Intel packages. Published 1.2.0 remains immutable.

Release review found preview caching requires Blob fetch permission under the desktop CSP. Production/development connect-src now explicitly permits Blob reads, preserving external-request restrictions. The FTP cache browser case exercises the restricted policy.

Validation: TypeScript, all 416 unit tests, signing/manifest Python regressions (19), FTP-cache CSP and updater browser cases (2), version consistency and whitespace checks pass. Previous C142 checks cover workflow YAML and split architecture mapping. No local packaging, signing, live server/capture or updater installation. Native Universal-to-thin transition and resulting package sizes await release CI/manual acceptance. Commit/main push explicitly authorized; CI publication status reported separately.
