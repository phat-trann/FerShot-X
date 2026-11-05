import type { FormEvent } from "react";
import type { ImageDocument } from "./contracts/media";
import type { ProcessOptions } from "./platform/native";

export function TransformTools({ image, busy, onTransform }: {
  image: ImageDocument; busy: boolean; onTransform: (options: ProcessOptions) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>, kind: "crop" | "resize") {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const width = Number(data.get("width")), height = Number(data.get("height"));
    onTransform(kind === "crop" ? { crop: { x: Number(data.get("x")), y: Number(data.get("y")), width, height } } : { resize: { width, height } });
  }
  return <div className="transform-tools" key={image.id}>
    <details><summary>Crop</summary><form className="transform-popover" onSubmit={(event) => submit(event, "crop")}>
      <label>X<input aria-label="Crop X" name="x" type="number" min="0" max={image.width - 1} defaultValue="0" required /></label>
      <label>Y<input aria-label="Crop Y" name="y" type="number" min="0" max={image.height - 1} defaultValue="0" required /></label>
      <label>Width<input aria-label="Crop width" name="width" type="number" min="1" max={image.width} defaultValue={image.width} required /></label>
      <label>Height<input aria-label="Crop height" name="height" type="number" min="1" max={image.height} defaultValue={image.height} required /></label>
      <button type="submit" disabled={busy}>Apply crop</button>
    </form></details>
    <details><summary>Resize</summary><form className="transform-popover" onSubmit={(event) => submit(event, "resize")}>
      <p>Fit within these dimensions, keeping aspect ratio.</p>
      <label>Width<input aria-label="Resize width" name="width" type="number" min="1" max="16384" defaultValue={image.width} required /></label>
      <label>Height<input aria-label="Resize height" name="height" type="number" min="1" max="16384" defaultValue={image.height} required /></label>
      <button type="submit" disabled={busy}>Apply resize</button>
    </form></details>
  </div>;
}
