# FerShot X in-app updates

## Current releases: Apple Silicon only

The user has discontinued Intel builds. Version 1.2.2 and later build only `aarch64-apple-darwin`, publishes only `darwin-aarch64` (and its matching installer alias), and verifies that the signed archive contains only arm64. Existing Intel/Universal releases remain immutable. Intel clients have no matching new update target. Historical split-release notes below describe 1.2.1. No new keys or endpoint changes are required.

Current release CI requires the configured persistent **FerShot X signing certificate**, without Apple notarization. Update archives additionally require authentic Tauri/minisign signatures. Local builds default to ad-hoc signing; CI never falls back to it. Preserve both the certificate and updater keypair across releases.

## Already configured

- Public endpoint: `https://github.com/phat-trann/FerShot-X/releases/latest/download/latest.json`.
- The validated real public key from `~/.tauri/fershot-x.key.pub` is embedded in `src-tauri/tauri.conf.json`. Public keys are safe to commit. No private key was read or copied by the agent.
- The base `bundle.macOS.signingIdentity` is `-` for local packaging. CI maps environment `release` variable `MACOS_SIGNING_IDENTITY` to `APPLE_SIGNING_IDENTITY`, imports secret `APPLE_CERTIFICATE` into a temporary runner keychain and requires the exact certificate. `APPLE_CERTIFICATE_PASSWORD` is optional for a passwordless certificate. No notarization credentials are used.
- `scripts/configure_updater.py` falls back to the checked-in public key and creates an ignored release overlay with signed updater artifacts enabled. It never generates keys. The default local build embeds the key but does not require a private key to package the first manually installed bootstrap.

## What you must do once on GitHub

In the **source repository**, open Settings → Environments → create/open **release**.

Add environment secrets:

| Name | Value |
| --- | --- |
| `APPLE_CERTIFICATE` | Base64-encoded PKCS#12 certificate and private key, configured directly by the user |
| `APPLE_CERTIFICATE_PASSWORD` | PKCS#12 password; leave empty for the configured passwordless certificate |
| `TAURI_SIGNING_PRIVATE_KEY` | Entire contents of `~/.tauri/fershot-x.key`, not the path |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password chosen when creating the key; omit/leave empty only if the key is unencrypted |

Copy file contents directly into the GitHub secret using your local editor/clipboard. Do not paste the private key/password into chat or commit them. Do not create another keypair: preserve and back up this keypair and password for all future versions.

Set environment variable `MACOS_SIGNING_IDENTITY` to the exact imported certificate name.

The `TAURI_UPDATER_PUBLIC_KEY` variable is optional because the public key is already embedded. If set, it must be the same key. No personal access token is needed when publishing to this same public repository: the workflow uses GitHub's provided token with `contents: write`. Ensure Actions and those permissions are allowed by repository/organization policy.

## First release and installation

1. Obtain user acceptance before committing/pushing a candidate. Existing user-reported acceptance and new native/manual verification are tracked separately.
2. Commit the reviewed source/workflow and push to **main** with an increased stable `package.json` version. The pipeline compares the previous push commit and creates the version tag automatically (`v1.1.0` for package version 1.1.0). No manual tag is required. The workflow is **Signed updater macOS release**.
3. Actions tests the source, builds separate Apple Silicon (`aarch64-apple-darwin`) and Intel (`x86_64-apple-darwin`) apps sequentially into one draft release, and merges their signed updater entries into `latest.json`. Both built apps and downloaded updater archives must match their expected architecture and the exact configured certificate. Both updater signatures are verified against the pinned public key before publication. Missing/swapped/universal archives fail the release, which stays a draft.
4. Download the DMG matching your Mac (aarch64 for Apple Silicon, x64 for Intel), or use the configured local bootstrap, quit the old app with Cmd-Q, then install FerShot X.app into `/Applications` **once**. The preceding unconfigured ZIP cannot update itself. Do not run the updater from inside the DMG or a read-only folder.
5. This app is not notarized. macOS may show an unidentified-developer warning on initial installation. Only for the app you built/trust, follow System Settings → Privacy & Security → Open Anyway after trying to open it. Do not disable Gatekeeper globally. Certificate continuity and macOS privacy behavior still need installed version-to-version acceptance.

## Verify the next version

Publish a genuinely newer accepted version, such as 1.1.1. From installed 1.1.0, Check for Updates must show the new version, Download must show progress and verify signatures, Install must wait for active work and preserve drafts, and Restart must run the new version without manually replacing the app. Check Settings, Keychain credentials, Local drafts, capture and FTP afterward. Test both Mac architectures. The updater uses `darwin-aarch64` or `darwin-x86_64` from the same endpoint; existing Universal installs can receive their matching thin binary without a key or endpoint change. Rosetta execution follows the architecture reported by the running updater. This transition still needs installed acceptance.

Automatic checks occur after launch and hourly while the app is running, limited by a persisted timestamp to one attempt every 24 hours. An overdue attempt runs on reopening/waking; the app does not launch itself after Cmd-Q. Download, install and restart remain explicit actions. Downloaded bytes are held only in the current process.

Future releases keep the same application identifier and keypair. Update only the canonical package.json version, run version:sync/check and validations, commit accepted changes, then push to main. A stable version increase triggers a release; ordinary unchanged/decreased versions skip. A release-pipeline repair may retry the same unpublished version; the remote guard still skips already published versions and prevents downgrades. Already published versions are not overwritten and older releases cannot replace latest. Use Actions → Signed updater macOS release → Run workflow on main to retry after fixing secrets, or rerun the original failed run. Existing draft tags must match their source commit; changed source needs a new version instead of overwriting that tag. A lost key requires a deliberate migration/reinstalled bootstrap; do not silently rotate keys.

## Optional separate public release repository

Not required for the current public source repository. For a separate destination, set environment variables `UPDATER_RELEASE_OWNER`, `UPDATER_RELEASE_REPO`, `UPDATER_RELEASE_REF` (an existing branch/commit there), and secret `UPDATER_RELEASE_TOKEN` with release write permission for that repository. Configure the local overlay with `--repository OWNER/REPO` so endpoint and release destination agree. No token enters the app.

Sources: [Tauri updater](https://v2.tauri.app/plugin/updater/), [Tauri ad-hoc signing](https://v2.tauri.app/distribute/sign/macos/), [Apple opening guidance](https://support.apple.com/en-us/102445).

## Optional persistent app signing (C101)

Local packaging defaults to ad-hoc; current release CI requires the configured certificate. For signing background, see [Persistent macOS app identity](STABLE-SIGNING.md). `MACOS_SIGNING_IDENTITY` plus user-managed `APPLE_CERTIFICATE` and `APPLE_CERTIFICATE_PASSWORD` enables the optional certificate path; this supersedes the earlier ad-hoc-only wording when configured. Updater keys are unchanged and still mandatory. No Apple ID/notarization credentials are added. Real certificate continuity acceptance remains pending.

## Passwordless FerShot X certificate (C102, current release CI)

The user has configured `APPLE_CERTIFICATE` and `MACOS_SIGNING_IDENTITY` in environment `release`. Empty PKCS#12 passwords are supported; `APPLE_CERTIFICATE_PASSWORD` is optional. Current release CI requires this stable identity rather than falling back to ad-hoc, imports only a new runner keychain, proves signing before build and verifies the exact public certificate in each architecture-specific built/distributed app before publication. No notarization is enabled. Existing updater keys and release/version detection remain unchanged. Local default configuration/history may still describe ad-hoc builds; that is not the current CI policy. No local Keychain or macOS permission changes were made.

## Architecture split rollout

Version 1.2.0 and older published Universal assets remain immutable. Version 1.2.1 introduces the split workflow; it does not replace those assets. No new GitHub secrets are required. Installed size should decrease because each app contains one CPU binary; actual sizes must be measured from the next CI artifacts.

Implementation follows [Tauri action updater generation](https://github.com/tauri-apps/tauri-action/blob/v1/src/upload-version-json.ts) and [Tauri updater platform keys](https://tauri.app/plugin/updater/).
