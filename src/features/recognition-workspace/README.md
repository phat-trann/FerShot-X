# Recognition workspace

`RecognitionWorkspace` composes the existing OCR and QR panels without native
or root wiring. The root owns source bytes, runtime language discovery,
recognition jobs, errors and cancellation.

Props:

- `languages`, `language`, `preserveLineBreaks`, `text`, `codes`, `busy`,
  `error`
- `onLanguageChange(language)`,
  `onPreserveLineBreaksChange(value)`
- `onRecognize("text" | "qr", language?)`
- `onCopy(text)` and `onCancel()`

Runtime language codes are displayed as labels and are not assumed to be
installed defaults. OCR controls are disabled when `languages` is empty; QR
scanning remains available. QR selection is local and is cleared when its
selected item disappears.
