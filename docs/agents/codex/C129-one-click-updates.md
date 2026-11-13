# C129 Icon update status and one-click installation

Checking shows a spinner; current status shows a green check, including on hover, without redundant up-to-date text. A new-version row includes an inline install icon.

The explicit Apply action owns the controller lock across official signed download, draft preparation, native busy/FTP checks, installation and restart. Background checks cannot apply. Busy failures retain verified downloads; install failures release the guard and require a fresh check. Restart failures remain retryable without reinstalling. Existing separate actions stay compatible.

Validation: TypeScript, 11 controller unit tests and five injected browser cases pass. Tests cover order, duplicate clicks, background rejection, download/install/busy/restart failures, progress and icon states. Screenshots inspected. Native action-enum compilation and real signed update/relaunch remain pending under the no-build instruction. No build, actual update installation, server action, commit or push.
