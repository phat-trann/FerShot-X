import {expect,test} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";

test("Blur pixels and editable geometry survive Local draft reopening",async({page})=>{
 await mock(page);
 await page.addInitScript(()=>{const create=document.createElement.bind(document);(window as any).__BLUR_CANVASES__=[];document.createElement=((tag:string,...args:any[])=>{const el=(create as any)(tag,...args);if(tag==="canvas")(window as any).__BLUR_CANVASES__.push(el);return el;}) as typeof document.createElement;});
 await page.goto("/?editor");
 const png=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=400;c.height=240;const ctx=c.getContext("2d")!;ctx.fillStyle="#fff";ctx.fillRect(0,0,400,240);ctx.fillStyle="#000";for(let x=0;x<400;x+=8)ctx.fillRect(x,0,4,240);return c.toDataURL("image/png").split(",")[1];});
 await page.locator('input[type="file"]').setInputFiles({name:"Blur.png",mimeType:"image/png",buffer:Buffer.from(png,"base64")});
 await page.getByRole("button",{name:"blur tool",exact:true}).click();const stage=page.getByTestId("advanced-workbench-stage"),b=(await stage.boundingBox())!;
 await page.mouse.move(b.x+40,b.y+40);await page.mouse.down();await page.mouse.move(b.x+180,b.y+140);await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="local_cache_save_draft").at(-1)?.args.request.draft.advanced[0]?.annotation.tool)).toBe("blur");
 // Sample the artwork layer away from selection handles and source-image layer.
 const sample=()=>stage.locator("canvas").nth(1).evaluate((c:HTMLCanvasElement)=>{const ratio=c.width/c.getBoundingClientRect().width;return [...c.getContext("2d")!.getImageData(Math.round(100*ratio),Math.round(80*ratio),1,1).data];});
 await expect.poll(async()=>(await sample())[3]).toBe(255);const before=await sample();expect(before[0]).toBeGreaterThan(40);expect(before[0]).toBeLessThan(215);
 const saved=await page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="local_cache_save_draft").at(-1).args.request);
 await page.evaluate(()=>(window as any).__EMIT__("fershot-editor-closed"));await expect(stage).toHaveCount(0);
 await expect.poll(()=>page.evaluate(id=>!!(window as any).__DRAFTS__[id],saved.id)).toBe(true);
 await page.evaluate(id=>{const w=window as any;w.__INBOX__.push({...w.__DRAFTS__[id],localId:id});w.__EMIT__("fershot-editor-image");},saved.id);
 await expect(page.getByLabel("Advanced item count")).toHaveText("1 items");
 await expect.poll(sample).toEqual(before);
 // Emulate WKWebView discarding an offscreen raster while its window is hidden.
 const discarded=await page.evaluate(()=>{const patches=((window as any).__BLUR_CANVASES__ as HTMLCanvasElement[]).filter(c=>!c.isConnected&&c.width===140&&c.height===100);for(const c of patches)c.getContext("2d")!.clearRect(0,0,c.width,c.height);window.dispatchEvent(new Event("fershot-editor-presented"));return patches.length;});
 expect(discarded).toBeGreaterThan(0);await expect.poll(sample).toEqual(before);
 await page.getByRole("button",{name:"select tool",exact:true}).click();await stage.click({position:{x:100,y:80}});await expect(page.getByLabel("Blur Strength")).toBeVisible();
 await page.getByLabel("Blur Strength").fill("16");
 await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="local_cache_save_draft").at(-1)?.args.request.draft.advanced[0]?.annotation.blurRadius)).toBe(16);
 await page.getByRole("button",{name:"Copy image",exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="copy_image").length)).toBe(1);
 const pixel=await page.evaluate(async()=>{const png=(window as any).__CALLS__.find((c:any)=>c.command==="copy_image").args.request.pngBase64;const img=new Image();img.src=`data:image/png;base64,${png}`;await img.decode();const c=document.createElement("canvas");c.width=img.width;c.height=img.height;const ctx=c.getContext("2d")!;ctx.drawImage(img,0,0);return [...ctx.getImageData(100,80,1,1).data];});
 expect(pixel[3]).toBe(255);expect(pixel[0]).toBeGreaterThan(40);expect(pixel[0]).toBeLessThan(215);
});
