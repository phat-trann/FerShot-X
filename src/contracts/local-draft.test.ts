import { describe,it,expect } from "vitest";
import { parseLocalDraft } from "./local-draft";
import { mapItem } from "../features/editor/konva/model";
import type { AdvancedEditorItem } from "../features/editor/advanced-workbench";
const item:AdvancedEditorItem={id:"shape",itemKind:"contract",annotation:{id:"shape",tool:"rectangle",points:[{x:10,y:20},{x:80,y:60}],style:{color:"#ff0000",strokeWidth:3,opacity:1}}};
describe("Local editable draft",()=>{
 it("roundtrips vector elements and rejects incompatible or malformed drafts",()=>{const draft={schemaVersion:1,width:100,height:80,annotations:[],advanced:[item]};expect(parseLocalDraft(JSON.parse(JSON.stringify(draft)),100,80).advanced).toEqual([item]);expect(()=>parseLocalDraft(draft,200,80)).toThrow();expect(()=>parseLocalDraft({...draft,schemaVersion:2},100,80)).toThrow();expect(()=>parseLocalDraft({...draft,advanced:[{...item,itemKind:"unknown"}]},100,80)).toThrow();});
 it("preserves rotated blur elements and rejects invalid blur geometry or rotation",()=>{const blur={...item,rotation:45,annotation:{...item.annotation,tool:"blur",blurRadius:8,points:[{x:10,y:10},{x:50,y:40}]}};const draft={schemaVersion:1,width:100,height:80,annotations:[],advanced:[blur]};expect(parseLocalDraft(draft,100,80).advanced[0].rotation).toBe(45);expect(()=>parseLocalDraft({...draft,advanced:[{...blur,rotation:NaN}]},100,80)).toThrow();expect(()=>parseLocalDraft({...draft,advanced:[{...blur,annotation:{...blur.annotation,points:[{x:1,y:1}]}}]},100,80)).toThrow();});
 it("maps raster transform geometry while retaining editable identity and style",()=>{const mapped=mapItem(item,p=>({x:p.x*2,y:p.y*2}),2);expect(mapped.id).toBe(item.id);if(mapped.itemKind!=="contract")throw new Error("Wrong kind");expect(mapped.annotation.points).toEqual([{x:20,y:40},{x:160,y:120}]);expect(mapped.annotation.style.strokeWidth).toBe(3);expect(item.annotation.points[0]).toEqual({x:10,y:20});});
});
