# C92 opening geometry and Freehand modes

Automatic opening now clamps zoom to the actual padded image viewport; when 100% cannot fit, it uses at most 80% and shrinks further as required. This removes automatic blank-space scrolling while retaining manual zoom/scroll and explicit Fit. Canvas wrappers no longer shrink independently. Native compact Edit sizing reserves additional chrome/padding, and common foreground restoration centers all three windows.

Freehand mode disables object/Transformer hit testing so gestures over an existing stroke draw another stroke. Select restores proportional four-corner resize and movement without a Freehand size slider or changing stroke thickness. Other tools keep their immediate post-creation manipulation.

TypeScript, 436 unit tests and all 51 synthetic Edit/Settings browser cases passed. Native geometry/centering tests and compilation remain NOT RUN under the no-build instruction. Updated manual acceptance covers full visibility, centering and mode-dependent Freehand behavior. Phase-2 acceptance remains 85%; synthetic checks do not establish native acceptance.
