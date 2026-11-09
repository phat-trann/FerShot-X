import { useEffect, useState } from "react";
import type { ImageDocument } from "./contracts/media";
import { WindowAppearanceControls } from "./features/window-appearance-controls";
import type { WindowAppearanceOptions } from "./platform/window-appearance";

/** Bind controls to real decoded source pixels; no blank fallback reaches Apply. */
export function WorkspaceWindowAppearance({ image, busy, onApply }: {
  image: ImageDocument; busy: boolean; onApply: (options: WindowAppearanceOptions) => void;
}) {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setSource(null); setError("");
    const element = new Image(); element.src = image.src;
    void element.decode().then(() => {
      if (element.naturalWidth !== image.width || element.naturalHeight !== image.height) throw new Error("Source dimensions changed.");
      if (alive) setSource(element);
    }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : "Appearance source could not be decoded."); });
    return () => { alive = false; };
  }, [image.src, image.width, image.height]);
  return <details className="window-appearance-controls"><summary>Window background and shadow trim</summary>
    <p>Apply an explicit background or trim to this image. Shadow edges are entered manually; source pixels are preserved.</p>
    <WindowAppearanceControls imageWidth={image.width} imageHeight={image.height} busy={busy || !source}
      windowSource={source ?? undefined} onApply={request => onApply({ background: request.background as WindowAppearanceOptions["background"], shadowTrim: request.shadowTrim })} />
    {error && <p role="alert">{error}</p>}
  </details>;
}
