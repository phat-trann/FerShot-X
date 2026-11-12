export interface ImageDocument {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
  /** Stable Local identity, shared by all raster derivatives of the same edit. */
  localId?: string;
  draft?: import("./local-draft").LocalDraft;
}
export type CaptureMode = "fullscreen" | "area" | "window";
export interface CapturePanelProps {
  onCapture: (mode: CaptureMode) => void;
  busy: boolean;
  error?: string;
}
