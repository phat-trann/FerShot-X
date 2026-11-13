# C149 Source-owned lens controls and Counter bounds

Linked Magnifier selection/resize now belongs to the source ellipse. The detached lens is drag-only; its radii equal source radii × magnification. Connector endpoints account for unequal ellipse sizes. Sampling/export uses the complete source region, while legacy unlinked lenses retain prior geometry. Source movement carries the lens; source resize derives output size. Draft and selection-proxy mapping retain source geometry.

Counter’s external selection rectangle and corner-direction handle track live drag offsets, including existing geometry scales; cancellation clears offsets. Other annotation drag behavior is preserved.

Validation: TypeScript and 422 unit cases passed; added magnification/source-selection coverage passed in a four-case focused rerun. Four browser cases cover source handles, detached-lens movement, magnification size ratio, resizing, Counter live geometry/cancel and existing blur/counter export behavior. Earlier export/reopen browser rerun passed. No build, real OS/server operations or publication. Version remains 1.2.2 pending acceptance.
