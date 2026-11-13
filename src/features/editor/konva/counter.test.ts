import { describe,it,expect,vi } from "vitest";
import { counterBounds,counterCorner,counterTip,traceCounterBadge } from "./counter";
import { parseLocalDraft } from "../../../contracts/local-draft";

describe("counter badge corner",()=>{
 it("points its tail continuously in any direction while preserving the numbered center",()=>{
  const center={x:100,y:100};
  expect(counterCorner(center,{x:140,y:115})).toBeCloseTo(20.556,2);
  expect(counterCorner(center,{x:140,y:100})).toBe(0);
  for(const [pointer,angle]of [[{x:80,y:120},135],[{x:80,y:80},225],[{x:120,y:80},315],[{x:120,y:120},45]]as const){expect(counterCorner(center,pointer)).toBeCloseTo(angle);const p=counterTip(center,12,angle);expect(Math.hypot(p.x-center.x,p.y-center.y)).toBeCloseTo(16.2);const b=counterBounds(center,12,angle);expect(p.x).toBeGreaterThanOrEqual(b.x);expect(p.y).toBeLessThanOrEqual(b.y+b.height);}
 });
 it("uses the same rounded body and pointed path for canvas export",()=>{
  const ctx={beginPath:vi.fn(),moveTo:vi.fn(),arc:vi.fn(),quadraticCurveTo:vi.fn(),closePath:vi.fn()};
  traceCounterBadge(ctx,{x:30,y:40},12,135);expect(ctx.arc).toHaveBeenCalledOnce();expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(2);const tip=counterTip({x:30,y:40},12,135);expect(ctx.quadraticCurveTo.mock.calls[0].slice(-2)).toEqual([tip.x,tip.y]);expect(ctx.closePath).toHaveBeenCalledOnce();
 });
 it("persists orientation in editable drafts and rejects invalid angles",()=>{
  const annotation={id:"counter",tool:"counter",points:[{x:30,y:40}],counter:1,counterAngle:225,style:{color:"#257EFE",strokeWidth:3,opacity:1}};
  const draft={schemaVersion:1,width:100,height:80,annotations:[],advanced:[{id:"counter",itemKind:"contract",annotation}]};
  expect(parseLocalDraft(JSON.parse(JSON.stringify(draft)),100,80).advanced).toEqual(draft.advanced);
  for(const angle of [NaN,360,-1])expect(()=>parseLocalDraft({...draft,advanced:[{...draft.advanced[0],annotation:{...annotation,counterAngle:angle}}]},100,80)).toThrow("counter corner");
 });
});
