# C126 Settings section dividers and inline icons

Settings groups now have left-leading headings followed by thin divider lines. Removed duplicate separators, static descriptions and routine saved/cleared notices. Actionable failures and updater/notification feedback remain.

Choose Folder/Reset are labelled icon-only buttons on the read-only folder field's row. Startup retry is an icon beside its switch, with a short tooltip and accessible unavailable-state context. Existing dialogs, autosave, startup gating and update operations are unchanged.

Validation: TypeScript, nine targeted unit tests and 23 browser cases passed across the initial batch and corrected/final reruns. Coverage includes headings, inline geometry, quiet saves, folder/reset callbacks, startup recovery, persistence/errors, Hotkeys and update progress/install/restart. Screenshots inspected. No build, real OS/server/credential actions, commit or push; user acceptance pending.
