# Color Format Controls

Controlled React UI component providing formatted color inspection and text copying:
- **Formats**: Formats sampled RGBA pixel colors into `HEX` (using `rgbToHex`), `RGB`, and `RGBA` string representations.
- **Validation**: Strict integer validation for channel bounds (`0..255`).
- **Alpha Preservation**: Preserves alpha transparency in RGBA format without rounding loss.
- **Empty & Error States**: Displays clear guidance when no color is sampled or when channel values are invalid.
- **Dedicated Copy Actions**: Each format offers an explicit copy button guarded by the `busy` state.

No native clipboard or pixel sampling APIs are called directly. Codex C34 integrates this component with the canvas pixel inspector and clipboard commands.

