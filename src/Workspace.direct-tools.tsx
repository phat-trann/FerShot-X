import { ArrowLeft } from "lucide-react";
import { Button } from "./components/ui/button";
import { LoadingState } from "./components/ui/content-state";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Annotation } from "./contracts/editor";
import type { ImageDocument } from "./contracts/media";
import type { AdvancedEditorItem } from "./features/editor/advanced-workbench";
import { KonvaRegionTools } from "./features/editor/konva/KonvaRegionTools";
import { type DirectTransformOptions } from "./features/direct-manipulation";
import type { PixelEffectRequest } from "./features/effects-panel";
import { renderWorkspaceDocument } from "./platform/annotations";

export function WorkspaceDirectTools({ image, annotations, advanced, busy, zoom, mode, onTransform, onEffect, onCancel }: {
  image: ImageDocument; annotations: readonly Annotation[]; advanced: readonly AdvancedEditorItem[];
  busy: boolean; zoom: number | null; mode: "crop" | "resize" | "effects";
  onTransform: (options: DirectTransformOptions) => void; onEffect: (effect: PixelEffectRequest) => void; onCancel: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [preview, setPreview] = useState<{ image: ImageDocument; basic: readonly Annotation[]; advanced: readonly AdvancedEditorItem[] } | null>(null);
  const [error, setError] = useState("");
  const needsPreview = annotations.length > 0 || advanced.length > 0;
  useEffect(() => {
    let live = true; let owned: string | undefined;
    setPreview(null); setError("");
    if (needsPreview) void renderWorkspaceDocument(image, annotations, advanced).then(rendered => {
      if (!live) { URL.revokeObjectURL(rendered.src); return; }
      owned = rendered.src;
      setPreview({ image: { ...rendered, id: image.id, name: image.name }, basic: annotations, advanced });
    }).catch(() => { if (live) setError("The edited preview could not be prepared. Return to annotations and retry."); });
    return () => { live = false; if (owned) URL.revokeObjectURL(owned); };
  }, [image.id, image.src, annotations, advanced, needsPreview]);
  useLayoutEffect(() => {
    const node = host.current; const stage = node?.closest(".stage");
    if (!node || !stage) return;
    const measure = () => {
      const box = stage.getBoundingClientRect(); const padding = getComputedStyle(stage);
      setFit(Math.max(0.001, Math.min(1,
        Math.max(1, box.width - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight)) / image.width,
        Math.max(1, box.height - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom)) / image.height)));
    };
    const observer = new ResizeObserver(measure); observer.observe(stage); measure();
    return () => observer.disconnect();
  }, [image.width, image.height, mode]);
  const ready = !needsPreview || (preview?.image.id === image.id && preview.basic === annotations && preview.advanced === advanced);
  return <div ref={host} className="workspace-direct-tools">
    {error ? <div role="alert">{error}<Button icon={ArrowLeft} variant="secondary" onClick={onCancel}>Return to image</Button></div> : !ready ? <LoadingState>Preparing edited preview…</LoadingState> :
      <KonvaRegionTools key={mode} image={needsPreview ? preview!.image : image} busy={busy} zoom={zoom ?? fit} mode={mode} onTransform={onTransform} onEffect={onEffect} onCancel={onCancel}/>}
  </div>;
}
