# C116 — Active-window icon

Shared title-bar glyph is visible only when the existing appearance hook marks its window active. Inactive/uninitialized windows hide the glyph with visibility while retaining dimensions and title/version alignment. The same CSS applies to Edit, Library and Settings. Menu-bar and packaged icons remain untouched.

The focused browser regression passes: blur hides the glyph, focus restores it and title geometry stays identical. No production TypeScript/native changes, build, real OS actions, commit or push. Local 1.1.11 remains pending user acceptance.
