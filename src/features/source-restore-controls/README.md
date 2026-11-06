# Source Restore Controls

Controlled component providing a guarded trigger to revert to the original un-annotated source capture:
- **Preservation Assurance**: Clarifies to users that restoring the original source preserves the current derived/annotated capture in the session without deleting images.
- **Availability State**: Displays "Retained" or "Unavailable" badges based on whether an origin image is retained.
- **Guarded Action**: Reversion button is strictly disabled when busy or when no retained source is available.

No ancestry tracking, global state mutation, or file deletion happens here. Codex C33 manages the underlying derivation graph.

