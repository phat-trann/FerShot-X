import {expect,it,vi} from "vitest";
import {magnifierConnector,drawMagnifier,lensRadii,sourceRadii} from "./magnifier";
import {parseLocalDraft} from "../../contracts/local-draft";
import {mapItem,itemBounds} from "../editor/konva/model";
import type {MagnifierEffect} from "./emphasis-renderer";
const effect:MagnifierEffect={id:"lens",kind:"magnifier",center:{x:200,y:150},sourceCenter:{x:60,y:50},radius:40,radiusY:20,zoom:2,borderColor:"#257EFE",borderWidth:3};
it("connector follows arbitrary angles, ends at ellipse boundaries and hides for overlap",()=>{
 const line=magnifierConnector(effect)!;for(const [p,c]of [[line[0],effect.sourceCenter!],[line[1],effect.center]])expect(((p.x-c.x)/(c===effect.center?80:40))**2+((p.y-c.y)/(c===effect.center?40:20))**2).toBeCloseTo(1);
 expect(magnifierConnector({...effect,center:{x:65,y:50}})).toBeNull();expect(magnifierConnector({...effect,sourceCenter:undefined})).toBeNull();
});
it("export samples the fixed original region and draws an equally sized elliptical lens",()=>{
 const c={save:vi.fn(),restore:vi.fn(),beginPath:vi.fn(),ellipse:vi.fn(),clip:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),drawImage:vi.fn()};const image={}as CanvasImageSource;drawMagnifier(c as unknown as CanvasRenderingContext2D,image,effect);
 expect(c.drawImage).toHaveBeenCalledWith(image,20,30,80,40,120,110,160,80);expect(c.ellipse.mock.calls[0].slice(0,4)).toEqual([60,50,40,20]);expect(c.lineTo).toHaveBeenCalledOnce();
});
it("draft round-trips source/radii and maps both ends during document resize",()=>{
 const item={id:"lens",itemKind:"emphasis" as const,effect};const draft={schemaVersion:1,width:600,height:400,annotations:[],advanced:[item]};expect(parseLocalDraft(JSON.parse(JSON.stringify(draft)),600,400).advanced[0]).toEqual(item);
 const mapped=mapItem(item,p=>({x:p.x/2,y:p.y/2}),.5);if(mapped.itemKind!=="emphasis"||mapped.effect.kind!=="magnifier")throw Error();expect(mapped.effect.sourceCenter).toEqual({x:30,y:25});expect(mapped.effect.radiusY).toBe(10);expect(itemBounds(mapped)).toEqual({x:10,y:15,width:40,height:20});
 for(const bad of [{radiusY:NaN},{sourceCenter:{x:-1,y:0}},{sourceCenter:{x:Infinity,y:20}}])expect(()=>parseLocalDraft({...draft,advanced:[{...item,effect:{...effect,...bad}}]},600,400)).toThrow();
});

it("magnification scales only the detached lens while source selection stays fixed",()=>{
 expect(sourceRadii(effect)).toEqual({x:40,y:20});expect(lensRadii(effect)).toEqual({x:80,y:40});
 const bigger={...effect,zoom:3};expect(lensRadii(bigger)).toEqual({x:120,y:60});
 expect(itemBounds({id:"lens",itemKind:"emphasis",effect:bigger})).toEqual(itemBounds({id:"lens",itemKind:"emphasis",effect}));
 const legacy={...effect,sourceCenter:undefined};expect(lensRadii(legacy)).toEqual({x:40,y:20});
});

it("places new lenses with a fixed edge gap on the roomiest fitting side",async()=>{
 const {initialMagnifierCenter,MAGNIFIER_GAP}=await import("./magnifier");
 for(const [source,width,height,expected]of [
  [{x:80,y:200},800,400,{x:192,y:200}],
  [{x:720,y:200},800,400,{x:608,y:200}],
  [{x:150,y:60},300,600,{x:150,y:132}],
  [{x:150,y:540},300,600,{x:150,y:468}],
 ]as const){expect(initialMagnifierCenter(source,20,10,3,width,height)).toEqual(expected);}
 for(const radius of [10,30,60]){const c=initialMagnifierCenter({x:100,y:250},radius,20,2,1000,500);expect(c.x-radius*2-(100+radius)).toBe(MAGNIFIER_GAP);}
 const fallback=initialMagnifierCenter({x:10,y:10},40,40,8,20,20);expect(fallback.x).toBeGreaterThanOrEqual(0);expect(fallback.x).toBeLessThanOrEqual(20);expect(fallback.y).toBeLessThanOrEqual(20);
});
