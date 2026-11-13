import {test,expect,type Page} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";
async function setup(page:Page){await mock(page);await page.goto("/?editor");const png=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=600;c.height=400;const x=c.getContext("2d")!;x.fillStyle="#fff";x.fillRect(0,0,600,400);x.fillStyle="#f00";x.fillRect(60,60,40,40);x.fillStyle="#00f";x.fillRect(100,60,40,40);return c.toDataURL().split(",")[1];});await page.locator('input[type="file"]').setInputFiles({name:"Lens.png",mimeType:"image/png",buffer:Buffer.from(png,"base64")});await expect(page.getByTestId("advanced-workbench-stage")).toBeVisible();}
async function items(page:Page){return page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="local_cache_save_draft").at(-1)?.args.request.draft.advanced);}
async function drag(page:Page,a:{x:number;y:number},b:{x:number;y:number}){await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();}
test("linked ellipse lens keeps source fixed when moving freely and survives export/reopen",async({page})=>{
 await setup(page);await page.getByRole("button",{name:"magnifier tool",exact:true}).click();const box=(await page.getByTestId("advanced-workbench-stage").boundingBox())!;
 await drag(page,{x:box.x+60,y:box.y+60},{x:box.x+140,y:box.y+100});await expect.poll(async()=> (await items(page))?.[0]?.effect.sourceCenter).toEqual({x:100,y:80});
 let e=(await items(page))[0].effect;expect(e.radius).toBe(40);expect(e.radiusY).toBe(20);const origin={...e.sourceCenter};
 await drag(page,{x:box.x+e.center.x,y:box.y+e.center.y},{x:box.x+e.center.x+60,y:box.y+e.center.y+70});await expect.poll(async()=> (await items(page))?.[0]?.effect.center.y).toBeCloseTo(e.center.y+70,0);e=(await items(page))[0].effect;expect(e.sourceCenter).toEqual(origin);
 await drag(page,{x:box.x+100,y:box.y+80},{x:box.x+120,y:box.y+90});await expect.poll(async()=> (await items(page))?.[0]?.effect.sourceCenter.x).toBeCloseTo(120,0);
 await page.getByRole("button",{name:"Copy image",exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="copy_image").length)).toBe(1);
 const saved=(await items(page))[0];const center={...saved.effect.center};
 const pixel=await page.evaluate(async center=>{const w=window as any,png=w.__CALLS__.find((c:any)=>c.command==="copy_image").args.request.pngBase64;const image=new Image();image.src="data:image/png;base64,"+png;await image.decode();const c=document.createElement("canvas");c.width=image.width;c.height=image.height;const x=c.getContext("2d")!;x.drawImage(image,0,0);return [...x.getImageData(Math.round(center.x),Math.round(center.y),1,1).data];},center);expect(pixel.slice(0,3)).toEqual([0,0,255]);
 await page.getByRole("button",{name:"Undo",exact:true}).click();await expect.poll(async()=> (await items(page))?.[0]?.effect.sourceCenter.x).toBe(100);
 await page.getByRole("button",{name:"Redo",exact:true}).click();await expect.poll(async()=> (await items(page))?.[0]?.effect.sourceCenter.x).toBeCloseTo(120,0);
 await page.evaluate(()=>{const w=window as any;const entry=Object.values(w.__DRAFTS__)[0];w.__INBOX__.push(structuredClone(entry));w.__EMIT__("fershot-editor-image");});
 await expect(page.getByRole("button",{name:"select tool",exact:true})).toHaveAttribute("aria-pressed","true");
 await page.mouse.click(box.x+center.x,box.y+center.y);await expect(page.getByLabel("Selection manipulation")).toHaveText("Eight handles and center movement");
 await page.getByRole("button",{name:"Copy image",exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="copy_image").length)).toBe(2);
 expect((await items(page))[0].effect).toEqual(saved.effect);

 await page.screenshot({path:"artifacts/qa/C148-linked-lens.png"});
});
test("Spotlight dimming hides during drag and returns at release; Counter supports non-diagonal angles",async({page})=>{
 await setup(page);const stage=page.getByTestId("advanced-workbench-stage"),b=(await stage.boundingBox())!;await page.getByRole("button",{name:"spotlight tool",exact:true}).click();await drag(page,{x:b.x+60,y:b.y+60},{x:b.x+140,y:b.y+120});
 const alpha=()=>stage.locator("canvas").nth(1).evaluate((c:HTMLCanvasElement)=>c.getContext("2d")!.getImageData(10*c.width/600,10*c.height/400,1,1).data[3]);await expect.poll(alpha).toBeGreaterThan(0);
 await page.mouse.move(b.x+100,b.y+90);await page.mouse.down();await page.mouse.move(b.x+130,b.y+110,{steps:6});await expect.poll(alpha).toBe(0);await page.mouse.up();await expect.poll(alpha).toBeGreaterThan(0);
 await page.mouse.move(b.x+130,b.y+110);await page.mouse.down();await page.mouse.move(b.x+160,b.y+130,{steps:5});await expect.poll(alpha).toBe(0);await page.keyboard.press("Escape");await page.mouse.up();await expect.poll(alpha).toBeGreaterThan(0);

 await page.getByRole("button",{name:"counter tool",exact:true}).click();await page.mouse.click(b.x+250,b.y+180);const handle=page.getByRole("button",{name:"Rotate counter corner",exact:true}),h=(await handle.boundingBox())!;await drag(page,{x:h.x+h.width/2,y:h.y+h.height/2},{x:b.x+300,y:b.y+200});await expect.poll(async()=> (await items(page))?.find((i:any)=>i.annotation?.tool==="counter")?.annotation.counterAngle).toBeCloseTo(21.8,0);
});
