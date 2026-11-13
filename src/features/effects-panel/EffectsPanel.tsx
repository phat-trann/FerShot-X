import { Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import React, { useState } from "react";
import "./EffectsPanel.css";
import { NativeSelect } from "../../components/ui/select";
import { Input } from "../../components/ui/input";

export interface EffectRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RgbaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export type PixelEffectRequest =
  | { readonly kind: "blur"; readonly rect: EffectRect; readonly radius: number }
  | { readonly kind: "mosaic"; readonly rect: EffectRect; readonly blockSize: number }
  | {
      readonly kind: "solidCover";
      readonly rect: EffectRect;
      readonly color: RgbaColor;
    }
  | { readonly kind: "transparentErase"; readonly rect: EffectRect };

type EffectKind = PixelEffectRequest["kind"];
const MAX_REGION_PIXELS = 4_194_304;
const HEX_COLOR = /^#([0-9a-f]{6})$/i;

function integer(value: string): number {
  return Number(value);
}

function parseColor(value: string, alpha: string): RgbaColor {
  const match = HEX_COLOR.exec(value);
  const a = Number(alpha);
  if (!match || !Number.isInteger(a) || a < 0 || a > 255) {
    throw new RangeError("Color must be six-digit hex with alpha 0-255.");
  }
  const hex = match[1];
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a,
  };
}

function validateRect(rect: EffectRect, imageWidth: number, imageHeight: number): void {
  if (
    !Number.isSafeInteger(rect.x) ||
    !Number.isSafeInteger(rect.y) ||
    !Number.isSafeInteger(rect.width) ||
    !Number.isSafeInteger(rect.height) ||
    rect.x < 0 ||
    rect.y < 0 ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.x + rect.width > imageWidth ||
    rect.y + rect.height > imageHeight ||
    rect.width * rect.height > MAX_REGION_PIXELS
  ) {
    throw new RangeError("Effect region is empty, outside the image, or too large.");
  }
}

export interface EffectsPanelProps {
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly busy: boolean;
  readonly onApply: (effect: PixelEffectRequest) => void;
}

export function EffectsPanel({
  imageWidth,
  imageHeight,
  busy,
  onApply,
}: EffectsPanelProps): React.JSX.Element {
  const [kind, setKind] = useState<EffectKind>("blur");
  const [rect, setRect] = useState<EffectRect>({ x: 0, y: 0, width: 100, height: 100 });
  const [radius, setRadius] = useState(8);
  const [blockSize, setBlockSize] = useState(8);
  const [color, setColor] = useState("#000000");
  const [alpha, setAlpha] = useState("255");
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    try {
      validateRect(rect, imageWidth, imageHeight);
      let effect: PixelEffectRequest;
      if (kind === "blur") {
        if (!Number.isSafeInteger(radius) || radius < 1 || radius > 64) {
          throw new RangeError("Blur radius must be between 1 and 64.");
        }
        effect = { kind, rect: { ...rect }, radius };
      } else if (kind === "mosaic") {
        if (!Number.isSafeInteger(blockSize) || blockSize < 2 || blockSize > 128) {
          throw new RangeError("Mosaic block size must be between 2 and 128.");
        }
        effect = { kind, rect: { ...rect }, blockSize };
      } else if (kind === "solidCover") {
        effect = { kind, rect: { ...rect }, color: parseColor(color, alpha) };
      } else {
        effect = { kind, rect: { ...rect } };
      }
      setError(null);
      onApply(effect);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invalid effect request.");
    }
  };

  const updateRect = (key: keyof EffectRect, value: string) => {
    setRect((current) => ({ ...current, [key]: integer(value) }));
  };

  return (
    <section className="fershot-effects-panel" aria-label="Pixel effects" aria-busy={busy}>
      <h2>Pixel effects</h2>
      <label>
        Effect
        <NativeSelect value={kind} disabled={busy} onChange={(event) => setKind(event.target.value as EffectKind)}>
          <option value="blur">Blur</option>
          <option value="mosaic">Mosaic</option>
          <option value="solidCover">Solid cover</option>
          <option value="transparentErase">Transparent erase</option>
        </NativeSelect>
      </label>
      <fieldset aria-label="Image-pixel region" disabled={busy}>

        {(["x", "y", "width", "height"] as const).map((key) => (
          <label key={key}>
            {key}
            <Input
              type="number"
              min={key === "width" || key === "height" ? 1 : 0}
              step={1}
              value={rect[key]}
              onChange={(event) => updateRect(key, event.target.value)}
            />
          </label>
        ))}
      </fieldset>
      {kind === "blur" ? (
        <label>
          Radius
          <Input type="number" min={1} max={64} value={radius} onChange={(event) => setRadius(integer(event.target.value))} />
        </label>
      ) : null}
      {kind === "mosaic" ? (
        <label>
          Block size
          <Input type="number" min={2} max={128} value={blockSize} onChange={(event) => setBlockSize(integer(event.target.value))} />
        </label>
      ) : null}
      {kind === "solidCover" ? (
        <>
          <label>
            Color
            <Input type="text" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          <label>
            Alpha
            <Input type="number" min={0} max={255} value={alpha} onChange={(event) => setAlpha(event.target.value)} />
          </label>
        </>
      ) : null}
      <Button icon={Sparkles} variant="secondary" type="button" disabled={busy} onClick={apply}>
        Apply effect
      </Button>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
