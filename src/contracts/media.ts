export interface ImageDocument {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
}
export type CaptureMode = "fullscreen" | "area" | "window";
export interface CapturePanelProps {
  onCapture: (mode: CaptureMode) => void;
  busy: boolean;
  error?: string;
}
export interface LibraryPanelProps {
  images: readonly ImageDocument[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}
