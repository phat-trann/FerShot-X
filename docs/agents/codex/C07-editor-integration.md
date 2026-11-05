# C07 editor and annotated raster integration

Status: PARTIAL for the full export/preferences integration; current rectangle/arrow/pen editor slice is wired and functionally verified.

Mounted reviewed EditorWorkbench with C01 immutable history and A04/A06 gestures/toolbar. A single mounted workbench retains per-image histories across selection and original/annotation view toggles. Root copies of annotations are removed on document close. Workbench retains closed-image history metadata until all images close; no closed source object URL is retained by that metadata.

Copy, save and crop/resize first render current annotations to a new bounded PNG, preserving originals. Temporary raster object URLs are revoked on consumer success/failure. Merge creates an independent PNG document; original annotations/history survive. Root guards restrict annotation colors to hexadecimal and omit fully transparent layers before the bounded renderer. Unsupported tools, excessive points and oversized outputs fail explicitly.

Canvas layout observes stage/tool-bar size and preserves source-pixel coordinate mapping under zoom/fit. Busy capture handlers prevent SVG editing during an image operation; native job serialization remains unchanged.

Actual checks: 30 reviewed module tests, 4 new raster ownership/validation tests and 2 new browser integration tests passed. The browser tests draw real source-coordinate rectangles, verify per-image undo/redo/delete/merge and decode copy/save PNG bytes from mocked IPC, asserting actual [239,68,68,255] stroke pixels. Frontend TypeScript/Vite build passed. A08 real-browser rectangle/arrowhead/pen/alpha pixel test also passed.

No real screenshot, clipboard write, native save dialog or native GUI acceptance occurred. Annotation end-to-end OS export gates remain open. A10 controlled export panel is accepted but Retina downscale has no trustworthy display metadata/capability yet; it is not exposed as a working option. Current toolbar exports use the existing safe format contract. Functional settings effects continue in C10. Formatting/lint delegated to Copilot H01.
