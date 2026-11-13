# C151 Zoom slider and Fit

Edit’s percentage cell opens a compact popover with the shared Slider (1–800%), a live percentage and an explicit Lucide Fit action. Zoom updates the existing Workspace state; wheel/pinch behavior and Fit’s camera reset remain unchanged. Status cells keep their geometry. Resize/Zoom popovers are mutually exclusive, close on document change/outside click, and Zoom Escape restores trigger focus without invoking image Copy/close.

Validation: TypeScript, twelve shared-control/source-guard unit cases and five browser cases pass. Browser checks cover slider and keyboard zoom, unchanged source pixels, Fit restoration, Escape focus/no-copy behavior, outside dismissal, Resize exclusivity, status width, full workspace geometry and retained color/wheel interactions. Version/whitespace checks pass.

No build, native OS/server operation or publication. Version remains 1.2.2; latest UI awaits user acceptance.
