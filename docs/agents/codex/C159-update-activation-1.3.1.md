# C159 update activation hotfix

The old macOS Reopen handler always presented Library, including during notification-driven Settings activation. Honor AppKit visibility, actual retained-window visibility and a bounded explicit Settings destination. Mark that destination before queueing the notification callback and on Settings opening. Clear on Settings close/destroy; expire after five seconds so normal all-hidden reopening remains available.

Validation: root cargo check --locked --tests and three pure Rust activation-policy cases pass. Cases cover visible views, notification/Reopen ordering, repeated events, expiry and close recovery. Version 1.3.1 is synchronized; whitespace check passes. No live notification, permission, capture, credential or updater-install action was performed. Installed macOS ordering still needs retest.

User explicitly requests normal main push now, without waiting for CI build. Video work remains separate and is not included in this patch.
