# T05 export audit

Target: Shottr 1.9.3 (build 137), bundle `cc.ffitch.shottr`; executable SHA-256 `4a1ea879e1079b81b1c501e7ef0c399cf7d0890c2b33fc79f97c4124620360a3`. Source is the selected projection in [`evidence/briefs/copilot-export.json`](../../evidence/briefs/copilot-export.json), based on REA Evidence `ev_873e89b3dfe28175d06beecfaef6a625b85d61fd7e7f79c50888494f39633abd` and `ev_7a54c59efe5ad259d8b8b7c187965d29df9ca99f3686ffa068c92add599df2ca`.

| Feature | Static evidence | Classification | Proposed runtime test |
|---|---|---|---|
| F05 Open/import | MainMenu.nib (`UI-02`, archive SHA-256 `058ff01e...12e34`) has “Open File”/`menuOpenFile:` and “Open From Clipboard”/`menuOpenFromClipboard:`. `Info.plist` declares Editor/Default handlers for `public.png`, `public.jpeg`, `public.compuserve.gif`. | STATIC_OBSERVED; registration does not establish decoding or animated-GIF behavior. | Open PNG, JPEG and animated GIF files, then use clipboard import with each supported image type. |
| F24 export actions | MainMenu.nib `UI-02` labels/actions: Copy Image/`menuCopy:`, Save Image/`menuSave:`, Save Image As/`menuSaveAs:`, Print/`menuPrint:` (objects 164/169/173/188). | STATIC_OBSERVED; clipboard types, file output and printing remain UNKNOWN. | Verify clipboard representations, default save, Save As destination, and print panel/output. |
| F25 save preferences | Preferences nib `UI-15` (archive SHA-256 `8aa20a6f...5e29`) exposes Screenshots folder, Select Folder/`clickSaveFolder:`, Save format, Auto (PNG/JPEG), PNG/`changeSaveFormat:`, Resize retina screenshots, and Downscale to 1×/`changeDownscale:`. | STATIC_OBSERVED; filename, quality and automatic format rules remain UNKNOWN. | Select a folder and each format/downscale option; save fixtures and inspect location, format and dimensions. |
| F32 deep links | `Info.plist` declares URL scheme `shottr`; Preferences nib `UI-12` has “URL Scheme API”, “Enable deep links” and `updateDeeplinks:`. | STATIC_OBSERVED; enabled state and supported URL commands remain UNKNOWN. | Toggle deep links and invoke a documented/known `shottr:` URL, checking whether the app handles it. |

No runtime verification was performed.
