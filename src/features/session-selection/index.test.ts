import { describe, expect, it } from "vitest";
import { nextSelectionAfterRemove } from "./index";

describe("nextSelectionAfterRemove", () => {
  it("chooses previous, next, or null when selected item is removed", () => {
    expect(nextSelectionAfterRemove(["a", "b", "c"], "b", "b")).toBe("a");
    expect(nextSelectionAfterRemove(["a", "b", "c"], "a", "a")).toBe("b");
    expect(nextSelectionAfterRemove(["a"], "a", "a")).toBeNull();
  });
  it("preserves survivor, handles stale IDs, and rejects duplicates", () => {
    expect(nextSelectionAfterRemove(["a", "b"], "b", "a")).toBe("b");
    expect(nextSelectionAfterRemove(["a"], "z", "z")).toBeNull();
    expect(() => nextSelectionAfterRemove(["a", "a"], "a", "a")).toThrow(RangeError);
  });

  it("preserves an empty-string selected survivor", () => {
    expect(nextSelectionAfterRemove(["", "b"], "", "b")).toBe("");
  });
});
