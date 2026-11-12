# FerShot X in-app updates — ad-hoc macOS distribution

Current policy: the macOS app is **ad-hoc signed**, with no Developer ID certificate or Apple notarization. Update packages still require authentic Tauri/minisign signatures. These two signatures are separate. User confirmed the GitHub repository is public and generated a real keypair in `~/.tauri`.

## Already configured

- Public endpoint: `https://github.com/phat-trann/FerShot-X/releases/latest/download/latest.json`.
- The validated real public key from `~/.tauri/fershot-x.key.pub` is embedded in `src-tauri/tauri.conf.json`. Public keys are safe to commit. No private key was read or copied by the agent.
- `bundle.macOS.signingIdentity` is `-`, so local/CI packaging signs the complete app ad-hoc. No Apple account, certificate, Team ID or notarization secrets are required by this pipeline.
- `scripts/configure_updater.py` falls back to the checked-in public key and creates an ignored release overlay with signed updater artifacts enabled. It never generates keys. The default local build embeds the key but does not require a private key to package the first manually installed bootstrap.

## What you must do once on GitHub

In the **source repository**, open Settings → Environments → create/open **release**.

Add environment secrets:

| Name | Value |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | Entire contents of `~/.tauri/fershot-x.key`, not the path |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password chosen when creating the key; omit/leave empty only if the key is unencrypted |

Copy file contents directly into the GitHub secret using your local editor/clipboard. Do not paste the private key/password into chat or commit them. Do not create another keypair: preserve and back up this keypair and password for all future versions.

The `TAURI_UPDATER_PUBLIC_KEY` variable is optional because the public key is already embedded. If set, it must be the same key. No personal access token is needed when publishing to this same public repository: the workflow uses GitHub's provided token with `contents: write`. Ensure Actions and those permissions are allowed by repository/organization policy.

## First release and installation

1. Current user authorization permits publishing a verification release at 85% acceptance. Native/FTP/updater acceptance remains pending and must not be represented as completed.
2. Commit the reviewed source/workflow and push to **main** with an increased stable `package.json` version. The pipeline compares the previous push commit and creates the version tag automatically (`v1.1.0` for package version 1.1.0). No manual tag is required. The workflow is **Signed updater macOS release**.
3. Actions tests the source, builds a universal Apple Silicon/Intel ad-hoc app, signs updater archives with your private key, generates `latest.json`, and verifies manifest destinations and archive signatures against the public key before publishing. Failed publication checks leave a draft.
4. Download the release or use the configured local bootstrap, quit the old app with Cmd-Q, then install FerShot X.app into `/Applications` **once**. The preceding unconfigured ZIP cannot update itself. Do not run the updater from inside the DMG or a read-only folder.
5. This app is not notarized. macOS may show an unidentified-developer warning on initial installation. Only for the app you built/trust, follow System Settings → Privacy & Security → Open Anyway after trying to open it. Do not disable Gatekeeper globally. Recheck Screen Recording/Accessibility permissions after replacement; ad-hoc identity changes need real acceptance.

## Verify the next version

Publish a genuinely newer accepted version, such as 1.1.1. From installed 1.1.0, Check for Updates must show the new version, Download must show progress and verify signatures, Install must wait for active work and preserve drafts, and Restart must run the new version without manually replacing the app. Check Settings, Keychain credentials, Local drafts, capture and FTP afterward. Test both Mac architectures; CI builds universal but local acceptance is not inferred.

Automatic checks occur after launch and hourly while the app is running, limited by a persisted timestamp to one attempt every 24 hours. An overdue attempt runs on reopening/waking; the app does not launch itself after Cmd-Q. Download, install and restart remain explicit actions. Downloaded bytes are held only in the current process.

Future releases keep the same application identifier and keypair. Update only the canonical package.json version, run version:sync/check and validations, commit accepted changes, then push to main. A stable version increase triggers a release; ordinary unchanged/decreased versions skip. A release-pipeline repair may retry the same unpublished version; the remote guard still skips already published versions and prevents downgrades. Already published versions are not overwritten and older releases cannot replace latest. Use Actions → Signed updater macOS release → Run workflow on main to retry after fixing secrets, or rerun the original failed run. Existing draft tags must match their source commit; changed source needs a new version instead of overwriting that tag. A lost key requires a deliberate migration/reinstalled bootstrap; do not silently rotate keys.

## Optional separate public release repository

Not required for the current public source repository. For a separate destination, set environment variables `UPDATER_RELEASE_OWNER`, `UPDATER_RELEASE_REPO`, `UPDATER_RELEASE_REF` (an existing branch/commit there), and secret `UPDATER_RELEASE_TOKEN` with release write permission for that repository. Configure the local overlay with `--repository OWNER/REPO` so endpoint and release destination agree. No token enters the app.

Sources: [Tauri updater](https://v2.tauri.app/plugin/updater/), [Tauri ad-hoc signing](https://v2.tauri.app/distribute/sign/macos/), [Apple opening guidance](https://support.apple.com/en-us/102445).
