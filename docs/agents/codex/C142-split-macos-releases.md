# C142 Split macOS releases

The existing release job now builds aarch64 and x86_64 sequentially into one draft. Official tauri-action merges both signed updater targets; the second build reuses the first release ID. Certificate import, environment, pinned updater key/endpoint, version detection, immutable-release guard and no-notarization policy remain intact.

Publication requires distinct manifest archives, consistent installer aliases, valid updater signatures and exact certificate/CPU checks for each built and downloaded app. Swapped archives, missing targets and Universal payloads fail verification. Legacy Universal verification remains available for historical tooling. README and updater setup explain download selection and transition.

Validation: 34 Python cases pass across signing, manifest, overlay and version detection. Ruby/Psych parses workflow YAML and confirms two thin targets, draft/update flags and release environment. Whitespace/version checks pass. No build, real signing, secrets, publication or installation. First split CI artifacts and Universal-to-thin updates require acceptance with the next approved version.
