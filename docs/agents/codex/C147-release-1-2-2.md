# C147 Release 1.2.2

User authorizes publishing C144–C146 and leaves the permission flow unchanged. Synchronizes product metadata to 1.2.2 and adds user-facing release notes. Ships ARM-only release validation, isolated window presentation, Delete label, actual-state updater alignment, inline logs and shared control/tooltip fixes. Temporary updater preview is absent.

Validation: TypeScript, 21 signing/manifest Python cases, five browser regressions after the version bump, ARM-only workflow YAML assertions, version and whitespace checks pass. C146’s full 419-case unit suite passed on the same production changes. Existing historical releases and updater/certificate identity remain untouched.

No local packaging, signing, private-key access, live capture/server/permission or update-install operations. Native Settings isolation and installed signed update transitions remain manual checks; publication does not fabricate their acceptance. Main commit/push explicitly authorized. Actual CI build/publication is reported separately.
