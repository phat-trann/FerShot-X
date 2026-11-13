# C137 Edit shortcut alignment

Tool hints now use explicit label/shortcut nodes with shared font metrics and baseline alignment. Shortcut text has no inherited keycap padding, border or background. Edit's overflow list uses icon/name/shortcut columns, with shortcut right edges aligned consistently.

Validation: two focused injected browser cases passed across the initial/final runs. Geometry checks compare label/shortcut top positions, heights, font sizes and shortcut right edges; overflow still selects tools without resetting history. Screenshot inspected. No build, real OS/server action, commit or push; visual acceptance pending.
