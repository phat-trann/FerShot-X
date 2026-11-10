import {describe,it,expect} from "vitest";
import {validateAdvancedItem,type AdvancedEditorItem} from "../advanced-workbench";
import {parseLocalDraft} from "../../../contracts/local-draft";
import {mapItem,itemBounds} from "./model";
const item:AdvancedEditorItem={id:"layer",itemKind:"image",src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC",rect:{x:10,y:20,width:80,height:40}};
describe("embedded image layer geometry and drafts",()=>{
 it("retains image bytes through geometry changes and draft parsing",()=>{const moved=mapItem(item,p=>({x:p.x+5,y:p.y+10}));expect(itemBounds(moved)).toEqual({x:15,y:30,width:80,height:40});expect(parseLocalDraft({schemaVersion:1,width:200,height:100,annotations:[],advanced:[moved]},200,100).advanced).toEqual([moved]);});
 it("rejects remote URLs and invalid geometry before loading",()=>{expect(()=>validateAdvancedItem({...item,src:"https://example.invalid/private.png"},200,100)).toThrow();expect(()=>validateAdvancedItem({...item,rect:{x:0,y:0,width:NaN,height:30}},200,100)).toThrow();});
});
