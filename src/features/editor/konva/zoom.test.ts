import {describe,it,expect} from "vitest";
import {initialEditorZoom,openingEditorScale} from "./zoom";
describe("opening zoom presets",()=>{
 it("keeps small and threshold-sized images at 100 percent",()=>{expect(initialEditorZoom(400,240,1000,600)).toBe(1);expect(initialEditorZoom(800,480,1000,600)).toBe(1);});
 it("uses exactly 80 percent when either dimension exceeds the threshold",()=>{expect(initialEditorZoom(801,480,1000,600)).toBe(.8);expect(initialEditorZoom(400,481,1000,600)).toBe(.8);});
 it("never opens cropped by the padded viewport and reserves 100 for images that fit",()=>{expect(openingEditorScale(400,240,1440,900,510,280)).toBe(1);expect(openingEditorScale(400,240,1440,900,380,230)).toBe(.8);expect(openingEditorScale(2000,1000,1440,900,800,500)).toBe(.4);});
});
