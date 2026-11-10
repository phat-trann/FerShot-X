import type { Annotation } from "./editor";
import type { AdvancedEditorItem } from "../features/editor/advanced-workbench";
import { validateAdvancedItem } from "../features/editor/advanced-workbench";
import { assertImageDimensions } from "../platform/image-limits";

export interface LocalDraft { schemaVersion:1; width:number; height:number; annotations:readonly Annotation[]; advanced:readonly AdvancedEditorItem[] }
export function parseLocalDraft(value:unknown,width:number,height:number):LocalDraft {
  assertImageDimensions(width,height);
  if(!value||typeof value!=="object")throw new Error("The saved edit draft is invalid; its data has been preserved.");
  const d=value as LocalDraft;
  if(d.schemaVersion!==1||d.width!==width||d.height!==height||!Array.isArray(d.annotations)||!Array.isArray(d.advanced)||d.annotations.length+d.advanced.length>1024||JSON.stringify(d).length>32*1024*1024)throw new Error("The saved edit draft is invalid; its data has been preserved.");
  for(const a of d.annotations)validateAdvancedItem({id:a.id,itemKind:"contract",annotation:a},width,height);
  for(const item of d.advanced)validateAdvancedItem(item,width,height);
  return d;
}
