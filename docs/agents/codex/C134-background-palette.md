# C134 Consistent backgrounds

Edit, Library and Settings bodies, chrome, navigation and sidebar now use the same opaque #232427 base through shared aliases/material tokens. Raised popovers and editor property panels consistently use #303136; inputs and selected controls retain #0F1216. Image pixels, checkerboards and semantic colors remain intact.

Validation: two injected browser cases passed, checking computed surface colors across every route, input/popover colors, popup interaction and unchanged canvas geometry. Screenshot inspected. No build, real OS/server operation, commit or push; user visual acceptance pending.
