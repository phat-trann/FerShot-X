# C112 — Borderless groups and icon actions

Removed nine legend nodes, retained accessible group names via aria-label and preserved disabled fieldset semantics. Settings groups are borderless with 24px separation and no card padding.

Shared Button supplies explicit leading Lucide icons and compact Edit-style geometry. Added icons to missing action call sites, including numeric resize presets; dialog actions now reuse Button through Radix Slot. Neutral actions stay white; primary/completion/restart/destructive intents use blue/green/amber/red. Canvas handles, Library rows and status cells retain specialized geometry. Removed competing shared button rules.

Checks: 438 unit tests, 23 focused injected browser regressions and no-emit TypeScript pass. Screenshots inspected; source guard rejects legends and iconless actions. No build, real OS/server/credential actions, commit or push. Existing functional acceptance stays 100% USER_REPORTED; local 1.1.11 awaits user acceptance. Earlier evidence remains immutable; this packet refreshes changed snapshots.
