# C71 editor and preview corrections

Removed Merge; added wheel zoom and a native drag region/capability. Closing the selected image clears selection and hides Edit instead of selecting a previous document. Konva now previews actual drawing geometry, selects newly created elements with resize handles, and portals applicable color/size controls into a separate row. Selection reads the element style; new drawings use the last edited style.

Status-bar artwork follows the uploader silhouette. Lucide menu icons are white with 60% of previous stroke.

HTTPS HEAD returned 401. Uploader source uses HTTP Basic, storefront credentials and FTP fallback. Added equivalent origin-scoped configuration, one-time native import, separate FerShot X Keychain account and preview retry. Authenticated redirects are blocked. Stored passwords never return to the renderer.

Checks: 411 unit tests, 19 browser cases and no-emit typecheck. Native compilation/build and authenticated server acceptance NOT RUN. Phase-2 acceptance remains 55%; release publication remains pending. USER_WAIVED_REVIEW; no formatting/lint.
