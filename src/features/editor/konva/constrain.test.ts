import {describe,it,expect} from "vitest";
import {constrainGesture} from "./constrain";
describe("Shift drawing constraints",()=>{
 it("keeps unconstrained geometry unchanged",()=>expect(constrainGesture({x:10,y:20},{x:80,y:40},"ellipse",false,100,100)).toEqual({x:80,y:40}));
 it("makes circles/squares and bounds them at image edges",()=>{const start={x:50,y:50},p=constrainGesture(start,{x:100,y:90},"ellipse",true,80,100);expect(p).toEqual({x:80,y:80});const reverse=constrainGesture(start,{x:20,y:40},"rectangle",true,80,100);expect(reverse).toEqual({x:20,y:20});});
 it("snaps lines, arrows and Shift-pen to straight 45-degree directions",()=>{for(const tool of ["arrow","line","pen"]){const p=constrainGesture({x:10,y:20},{x:80,y:25},tool,true,100,100);expect(p.y).toBeCloseTo(20);const q=constrainGesture({x:10,y:20},{x:50,y:57},tool,true,100,100);expect(q.x-10).toBeCloseTo(q.y-20);}});
});
