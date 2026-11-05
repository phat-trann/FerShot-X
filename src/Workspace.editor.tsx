import { useLayoutEffect, useRef, useState } from "react";
import type { Annotation } from "./contracts/editor";
import type { ImageDocument } from "./contracts/media";
import { EditorWorkbench } from "./features/editor/workbench";

export function WorkspaceEditor({ image, annotations, active, busy, zoom, onChange }: {
  image: ImageDocument; annotations: readonly Annotation[]; active: boolean; busy: boolean; zoom: number | null;
  onChange: (id: string, annotations: readonly Annotation[]) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
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
      <EditorWorkbench imageId={image.id} imageSrc={image.src} imageWidth={image.width} imageHeight={image.height}
        initialAnnotations={annotations} onAnnotationsChange={onChange} />
    </fieldset>
  </div>;
}
