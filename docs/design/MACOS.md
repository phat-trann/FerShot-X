# macOS design application

FerShot X uses [ceorkm/macos-design-skill](https://github.com/ceorkm/macos-design-skill), pinned at `8f528a2364f996cd42f02a10b1b27198a74ca2a3`. The original package is installed in [.agents/skills/macos-design](../../.agents/skills/macos-design/SKILL.md). [Provenance and byte hashes](../third-party/macos-design-skill.json) make future updates intentional. The upstream README declares MIT; it supplies no separate license file.

Read this adapter and [INTERFACE.md](INTERFACE.md), then the skill's layout, visual and interaction references before interface work. User requirements and AGENTS.md take precedence over generic upstream defaults.

## Applied to the product

| Skill principle | FerShot X implementation |
| --- | --- |
| Native chrome and uncluttered dragging | Keep real macOS traffic lights and existing Tauri overlay title bars; never draw imitation dots. Shared left titles/version spacing remain. Only the active window shows the title glyph; inactive windows retain its layout box and soften chrome without dimming documents. |
| Hierarchy through surfaces | Solid image/content area; distinct sidebar, raised controls and translucent renderer chrome/popovers. Palette remains #232427/#257EFE with white/silver text. |
| Materials and depth | Bounded blur plus saturation for chrome, sidebar and popovers; layered popup/dialog shadows. CSS fallbacks stay opaque. Never blur the canvas or body text. These are renderer materials, not a claim of newly enabled desktop-through-window native vibrancy. |
| Content before controls | Library shows one preview and row list. Empty collections hide irrelevant Edit/selection actions and offer a relevant Settings action. Initial loading is distinct from an empty collection. |
| Feedback and input | Immediate tooltips and shortcut hints, busy/disabled states, retained confirmed values for saves/deletion, subtle row transitions and drop-zone feedback. Region tools receive keyboard focus on entry; Escape can cancel without a preliminary pointer gesture. Keep native close/quit behavior and current capture/output flows. |
| Accessibility | Existing Radix form/dialog semantics; labels, actual disabled controls, semantic status colors and non-ring keyboard focus. Reduced motion stops decorative animation; reduced transparency/high-contrast use solid materials. |

Loading placeholders are icon-only visually. Their descriptive text remains in an `sr-only` span inside `role=status`; do not remove it or use display:none. The spinner respects reduced motion.

Library selection actions own Copy/Delete for Local and Copy links/Remove history/Delete from FTP for FTP. Do not duplicate them in the preview. Remove history changes local FTP queue/history only; remote deletion keeps its explicit confirmation. Unique Edit/Refresh/Retry upload actions remain near their context. Active uploads block history removal and remote deletion; partial failures retain remaining selections for retry.

## Project-specific decisions

- Keep the exact `system-ui, -apple-system, BlinkMacSystemFont, sans-serif` stack, readable 14px body scale, 32px shared controls, 12px control rounding and 20px panels. The upstream 13px/6px defaults do not replace the user's chosen standard.
- Keep fixed dark appearance and blue accent. Do not introduce automatic light mode, system accent replacement or a language selector.
- Keep Edit's dedicated toolbar and edge-to-edge image workspace, compact 30px title drag region, Settings' 25.92px navigation icons/88% caption labels/6px row gaps/12px section gaps, and Library's 25% list. Do not impose an arbitrary 50px title region or change image/window sizing.
- Keep thin borders and real button backgrounds in Settings/Library. Edit tools are transparent without visible borders at rest, use accent ink for selection and gain a framed elevated surface on hover. Fieldset frames/legends stay absent. Existing specialized hotkey capsules keep 28px geometry.
- Keep immediate Hotkeys persistence and macOS modifier glyphs. No fake optimistic success: hotkey persistence, FTP upload/deletion, Save and Copy acknowledge real completion/failure. No reintroduced upload-success banners.
- Search, onboarding, extra sidebars, new drag/export modes and share sheets are product changes, not mandatory additions during a design-system application. Existing import/drop and bounded native drag APIs remain unchanged; this pass adds no synthetic file-export shim or widened native permission.
- Avoid `transition: all`, document scaling effects, animated canvas geometry and route animations that can reveal stale captures. Preserve lazy loading and thumbnail/draft caching.
- Materials create stacking contexts. Keep Edit chrome above the image workspace so popup controls remain clickable; never compensate by disabling pointer events or changing canvas geometry.
- No fake native appearance controls or no-op buttons. Empty-state actions open actual Settings tabs. New OS behavior is never declared accepted from injected browser tests.

## Maintenance and verification

The upstream package stays unmodified. Update it only by pinning a new commit and refreshing the provenance manifest. Project decisions live here; visual tokens live in `src/styles/tokens.css`, materials in `src/styles/macos.css`, and controls in `components/ui`.

Check all three window routes, compact Settings, keyboard/selection/deletion, real loading versus empty collections, popup focus/shadows, reduced motion/high contrast, capture repaint and lazy-window loading. Use injected native/server operations for automation. Native appearance, capture and cross-application dragging still require user-driven acceptance on an installed app. No build, commit or push before the user's current authorization/acceptance gate.

Settings content uses a centered 420px column, right-aligned labels and 50% control columns matching Hotkeys. Use local 12px content/control text and 11px supporting text; header sizes and other windows retain their established scale. Save destination and FTP publishing stay open without collapsible wrappers.

The Edit image workspace stretches to all available space below chrome, with no outer/stage padding or fixed 16:9 viewport. Preserve bitmap aspect ratio, small-image 100% opening policy, Fit, pointer-centered zoom/pan and independent floating properties. Native window sizing remains unchanged. Crop uses the same available viewport without obsolete inline-header allowances.

Settings section headings lead thin divider lines from the left. Routine helper/save messages stay absent; failures and active updater feedback remain. Folder and retry actions use labelled Lucide icon buttons inline with their associated field or checkbox.

Settings has no Done/footer action region. Settings options use shared control-first checkboxes with linked labels, preserving native disabled-fieldset behavior and autosave. Updates contains the existing product icon, inline icon-only check action beside Current version and the actual version status beneath it; no Test Notification button. Background update notification delivery and explicit download/install/restart remain intact.

Resize uses the supplied compact text-only reference with one explicit apply action, no crop-region entry or Cancel icon. Utility actions after Settings labels/versions are bare icons. Preserve stable Library header metrics during loading. Native Edit positioning resolves the pointer display instead of reusing the hidden window monitor; test this on actual mixed-scale displays when a build is authorized.

Updates uses a loading glyph during checking and a green tick when current, preserving accessible status without visible up-to-date copy. New version rows contain an inline install glyph that explicitly starts the guarded download/install/restart chain. Automatic launch/daily checks and native notices never start installation.

Every product window (Edit, Library, Settings) recenters in the display-under-pointer work area on opening/reopening, including a previously moved window. Startup geometry and Edit sizing use the same monitor resolver. Keep native outer dimensions and all renderer geometry; account for display scale changes using actual physical outer size. Native compile/manual display validation requires separate build authorization.

Uniform background override: bodies/chrome/sidebar/navigation use the same opaque #232427; raised panels use #303136 and inputs/selection #0F1216. Shared material tokens alias these surfaces so region colors do not drift through alpha blending. Existing layered shadows, accessibility fallbacks, image pixels/checkerboards and semantic accents remain.

Settings logs use one retention row with input, days and the Open Logs Folder icon. Folder buttons inherit shared Button hover/border/disabled styles. Tool hints snap final positions to device pixels without transformed text. Only actual updater state renders New version; the temporary development preview has been removed after user acceptance.
