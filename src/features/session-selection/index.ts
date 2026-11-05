export function nextSelectionAfterRemove(
  ids: readonly string[], selectedId: string | null, removedId: string,
): string | null {
  if (new Set(ids).size !== ids.length) throw new RangeError("duplicate IDs");
  const removedIndex = ids.indexOf(removedId);
  if (removedIndex < 0) return selectedId !== null && ids.includes(selectedId) ? selectedId : null;
  if (selectedId !== removedId) return selectedId !== null && ids.includes(selectedId) ? selectedId : null;
  return ids[removedIndex - 1] ?? ids[removedIndex + 1] ?? null;
}
