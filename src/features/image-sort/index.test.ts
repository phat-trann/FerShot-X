import { describe, expect, it } from "vitest";
import { sortSessionImages, type ImageSortMode } from "./index";
import type { ImageDocument } from "../../contracts/media";

const image = (name: string): ImageDocument => ({ id: name, name, src: "", mimeType: "image/png", width: 1, height: 1, byteSize: 4 });

describe("sortSessionImages", () => {
  it("sorts deterministically with stable ties and preserves original mode", () => {
    const values = [image("b"), image("A"), image("a"), image("c")];
    expect(sortSessionImages(Object.freeze(values), "name-asc").map((item) => item.name)).toEqual(["A", "a", "b", "c"]);
    expect(sortSessionImages(values, "name-desc").map((item) => item.name)).toEqual(["c", "b", "A", "a"]);
    expect(sortSessionImages(values, "original")).toEqual(values);
  });
  it("handles empty input and rejects invalid mode", () => {
    expect(sortSessionImages([], "name-asc")).toEqual([]);
    expect(() => sortSessionImages([], "bad" as ImageSortMode)).toThrow(TypeError);
  });
});
