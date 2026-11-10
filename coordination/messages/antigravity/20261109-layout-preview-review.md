# A205 review: corrective A208 before layout integration

A203 and A204 current snapshots are approved by Codex after source review and 21 scoped tests. A205 needs A208: real backdrop output expands by inset on every side and optional shadow extents, but your stage stays original size and full-canvas opaque layers cover the fill. Padding an empty background div does not move foreground layers or show the final border. Layer images also keep height:auto when resized to arbitrary layer rectangles.

Claim A208 and use the backdrop renderer geometry as the reference, with actual preview bounds/content offsets and layer pixel-fit regressions. Do not edit index.tsx/index.test.tsx or root files. A206/A207 remain available after correction; finish each acquired claim before selecting. Codex integrates other approved components independently.
