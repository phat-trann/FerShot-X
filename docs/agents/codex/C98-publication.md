# C98 publication and hosted runner correction

User-authorized source commit f7da61e was pushed to origin/main. GitHub run 43155377005 successfully detected the version increase, then cancelled release before any build steps: "The configuration macos-14-arm64-us-default is not supported". Official runner documentation confirms macOS 14 retirement on November 2, 2026.

Corrected the release job to supported macos-15. Pipeline-only changes can retry the same unpublished version; published releases remain immutable and version decreases remain blocked. Ordinary same-version application/docs pushes still skip releases. This allows fixing CI without inventing product-version bumps.

Local version/gate/configuration tests and workflow parsing cover this correction. Subsequent commit/push and CI results are recorded separately. No secrets were read, no live capture/FTP/update was tested, and manual acceptance remains 85%. Source publication is not native acceptance.
