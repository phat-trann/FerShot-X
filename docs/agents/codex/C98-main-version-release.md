# C98 main version releases and publication

User explicitly authorizes committing/pushing the 1.1.0 verification candidate before completing native acceptance. Acceptance remains 85%; no manual passes are invented.

Main pushes compare stable package.json versions with the push's prior commit. Only increases release; initial main and explicit main dispatch are supported. Published versions stay immutable, older versions cannot replace latest, and draft tags must match their source. The release action creates tags automatically; manual tags are unnecessary. Preserve ad-hoc app signing and required updater signatures.

Checks: six version-planner tests, eight mocked API/tag guard tests, five key/configuration tests, workflow YAML and version consistency passed. Actual local push-plan dry run detected 1.0.0 → 1.1.0. Existing C95–C97 app/native/build evidence remains recorded; no new application build was needed for workflow-only changes.

Commit/push and remote CI results are recorded in a subsequent publication packet. Credentials/artifacts remain excluded.
