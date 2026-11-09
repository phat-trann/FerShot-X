# Shottr comparison: region coordinates

Target: Shottr 1.9.3 (137), `/Applications/Shottr.app/Contents/MacOS/Shottr`, SHA-256 `4a1ea879e1079b81b1c501e7ef0c399cf7d0890c2b33fc79f97c4124620360a3` (matches `evidence/target.json`). Skill: reverse-engineer-anything.

REA metadata `ev_730b1f6e1d6d8d6c0232583a4b8473eab3e84cd71176e71d2aee76d915e42c9d` resolves `_TtC6Shottr14RegionSelector.mouseUp:` to `0x10015c1cc`. REA objdump `ev_528ca98abf056b816e75bdae08f70f79999b375272aed1844ce4390c54fffaca` shows that method calling `0x10015eae8`. Reading that actual body, rather than relying on selectors, establishes these STATIC_OBSERVED facts:

- `0x10015ebf8` calls CGRectOffset after reading frame minima.
- `0x10015ecc8–0x10015ecd0` obtains a height and computes a subtraction involving Y and height.
- `0x10015ed48–0x10015ed54` applies four ARM64 FRINTA instructions before passing rectangle components to an indirect callback at `0x10015ed70`.

INFERRED: this path converts an AppKit rectangle into another screen-coordinate representation and rounds components before delivery. The indirect callback target and its complete consumer remain UNKNOWN. Runtime matching, Retina/multiple-display equivalence and cancellation behavior were not observed in Shottr. Ferby independently uses decoded-image top-left physical pixels and bounded integer rectangles; no original code is copied into its implementation. New synthetic tests establish Ferby behavior only.

Limitations: no configured native decompiler; metadata reports unresolved relative pointers and a 5,000-record budget. Objdump output hit its 16 MiB cap (SIGKILL; completion unknown); the cited address spans are present, but the complete executable was not decoded. The transport also rejected an oversized retained view. Do not rerun the producer just to retrieve the same output. Complete retained session records were exported to ignored `evidence/raw/C42-shottr-review.json` before session closure; retained view `ev_9888c30e2e5083ff6c2e651c8bb01b5884bc528e1931d2ca2a6f3f29a2573714` is also preserved there.
