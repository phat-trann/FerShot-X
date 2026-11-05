import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Annotation } from "./contracts/editor";
import type { ImageDocument } from "./contracts/media";
import { EditorWorkbench } from "./features/editor/workbench";
import { AdvancedWorkbench, type AdvancedEditorItem } from "./features/editor/advanced-workbench";
import { renderAnnotatedDocument } from "./platform/annotations";

export function WorkspaceEditor({ image, annotations, advancedItems, active, busy, zoom, onChange, onAdvancedChange }: {
  image: ImageDocument; annotations: readonly Annotation[]; active: boolean; busy: boolean; zoom: number | null;
  advancedItems: readonly AdvancedEditorItem[];
  onChange: (id: string, annotations: readonly Annotation[]) => void;
  onAdvancedChange: (id: string, items: readonly AdvancedEditorItem[]) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [basePreview, setBasePreview] = useState<{ id: string; src: string } | null>(null);
  useEffect(() => {
    let live = true;
    let owned: string | undefined;
    setBasePreview(null);
    if (advancedMode && annotations.length) {
      void renderAnnotatedDocument(image, annotations).then(rendered => {
        if (!live) { URL.revokeObjectURL(rendered.src); return; }
        owned = rendered.src; setBasePreview({ id: image.id, src: owned });
      }).catch(() => { /* Main export reports raster errors; the original remains available. */ });
    }
    return () => { live = false; if (owned) URL.revokeObjectURL(owned); };
  }, [image.id, image.src, annotations, advancedMode]);
  useLayoutEffect(() => {
    const node = host.current;
    const stage = node?.closest(".stage");
    if (!node || !stage) return;
    const measure = () => {
      const bounds = stage.getBoundingClientRect();
      const padding = getComputedStyle(stage);
      const bar = node.querySelector(".ferby-editor-workbench__bar")?.getBoundingClientRect().height ?? 0;
      const width = bounds.width - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
      const height = bounds.height - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom) - bar - 24;
      setFit(Math.max(Number.EPSILON, Math.min(1, Math.max(1, width) / image.width, Math.max(1, height) / image.height)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    const bar = node.querySelector(".ferby-editor-workbench__bar");
    if (bar) observer.observe(bar);
    measure();
    return () => observer.disconnect();
  }, [image.width, image.height, active]);
  return <div ref={host} hidden={!active} className="editor-surface" aria-busy={busy}
    onPointerDownCapture={(event) => { if (busy) { event.preventDefault(); event.stopPropagation(); } }}
    onKeyDownCapture={(event) => { if (busy) { event.preventDefault(); event.stopPropagation(); } }}>
    <fieldset disabled={busy} className="editor-fieldset" style={{ "--editor-canvas-width": `${image.width * (zoom ?? fit)}px` } as React.CSSProperties}>
      <button type="button" aria-pressed={advancedMode} onClick={() => setAdvancedMode(value => !value)}>Advanced annotation tools</button>
      <div hidden={advancedMode}>
      <EditorWorkbench imageId={image.id} imageSrc={image.src} imageWidth={image.width} imageHeight={image.height}
        initialAnnotations={annotations} onAnnotationsChange={onChange} />
      </div>
      <div hidden={!advancedMode}>
        <AdvancedWorkbench imageId={image.id} imageSrc={basePreview?.id === image.id ? basePreview.src : image.src}
          imageWidth={image.width} imageHeight={image.height} zoom={zoom ?? fit} initialItems={advancedItems}
          onSnapshotChange={snapshot => onAdvancedChange(image.id, snapshot.items)} />
      </div>
    </fieldset>
  </div>;
}
