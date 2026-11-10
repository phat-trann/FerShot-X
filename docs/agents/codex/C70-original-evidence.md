# C70 original scrolling reference

Target: version 1.9.3, build 137; executable SHA-256 4a1ea879e1079b81b1c501e7ef0c399cf7d0890c2b33fc79f97c4124620360a3, recorded in evidence/target.json.

STATIC_OBSERVED: existing resource analysis exposes scrolling speed, maximum height and reverse-scrolling preferences. This establishes controls, not an implementation algorithm. C70 reopened /Applications/Shottr.app through REA bundle resources. Complete Interface Builder decoding exceeded the 10 MiB tool response limit; evidence ev_aa5f01d324074d69b822612f0a9ce7a24a343cc3dcfe6e2a3ae6ecbb6140e930 was exported intact to ignored evidence/raw/C70-rea-bundle.json (5,474,900 bytes).

UNKNOWN: original automatic-scroll stopping/alignment internals and runtime equivalence. Native decompiler providers were unavailable; no setup, original app interaction or capture occurred. FerShot X independently implements the user's selected-region/Escape/unchanged-content contract using existing capture/stitch cores. Synthetic tests validate its boundaries, not original runtime parity.
