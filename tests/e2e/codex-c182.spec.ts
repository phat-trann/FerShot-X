import {test,expect,type Page} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";
const calls=(page:Page,command:string)=>page.evaluate(command=>(window as any).__CALLS__.filter((row:any)=>row.command===command),command);
test("healthy FTP remains usable when Local fails, and Local reports its own error",async({page})=>{
 await mock(page);await page.addInitScript(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=(command:string,args:any)=>command==="local_cache_list"?Promise.reject({code:"cache_failed"}):invoke(command,args);});await page.goto("/");await expect(page.getByRole("option",{name:/frozen.png/})).toBeVisible();await expect(page.locator(".library-error")).toHaveCount(0);await page.getByRole("tab",{name:/Local/}).click();await expect(page.getByRole("alert")).toContainText("Local history");await page.getByRole("tab",{name:/FTP/}).click();await expect(page.getByRole("option",{name:/frozen.png/})).toBeVisible();
});
test("Local revisions invalidate both preview and thumbnail without reloading unchanged documents",async({page})=>{
 await mock(page);await page.goto("/");await page.getByRole("tab",{name:/Local/}).click();await expect(page.locator(".library-image-preview img")).toBeVisible();const before=(await calls(page,"library_image")).filter((r:any)=>r.args.kind==="local").length;await page.evaluate(()=>{const w=window as any;w.__LOCAL__[0].revision=2;w.__EMIT__("fershot-library-updated");});await expect.poll(async()=>(await calls(page,"library_image")).filter((r:any)=>r.args.kind==="local").length).toBe(before+1);await expect.poll(async()=>(await calls(page,"library_thumbnail")).filter((r:any)=>r.args.kind==="local"&&r.args.id==="local-1").length).toBeGreaterThan(1);await page.evaluate(()=>(window as any).__EMIT__("fershot-library-updated"));await page.waitForTimeout(300);expect((await calls(page,"library_image")).filter((r:any)=>r.args.kind==="local")).toHaveLength(before+1);
});
async function movie(page:Page,library=false){await mock(page);await page.addInitScript(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="ftp_enqueue_video"){w.__CALLS__.push({command,args});return{id:"222-1",url:"https://example.invalid/video.mp4"};}if(command==="copy_text"&&w.__FAIL_COPY__){w.__CALLS__.push({command,args});throw{code:"clipboard_failed",message:"Synthetic clipboard failure"};}return invoke(command,args);};});await page.goto(library?"/":"/?editor");await page.waitForFunction(()=>typeof(window as any).__EMIT__==="function");const source=await page.evaluate(async()=>{
 const canvas=document.createElement("canvas");canvas.width=160;canvas.height=90;const ctx=canvas.getContext("2d")!;
 const stream=canvas.captureStream(10);const recorder=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp8"});const chunks:BlobPart[]=[];
 const done=new Promise<string>(resolve=>{recorder.ondataavailable=event=>chunks.push(event.data);recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());resolve(URL.createObjectURL(new Blob(chunks,{type:"video/webm"})));};});
 recorder.start();const timer=setInterval(()=>{ctx.fillStyle="#257efe";ctx.fillRect(0,0,160,90);},55);await new Promise(resolve=>setTimeout(resolve,350));clearInterval(timer);recorder.stop();return done;
 });await page.evaluate(({library,source})=>{const w=window as any,clip={id:"video-regression",revision:"r1",name:"Synthetic.mp4",width:640,height:360,durationMs:10000,byteSize:20,createdAt:Date.now(),mediaPath:source,poster:"",hasAudio:false};const cue={id:"locked-cue",kind:"highlight",x:.2,y:.2,width:.2,height:.2,startMs:0,endMs:10000,color:"#257EFE",opacity:.3};const draft={schemaVersion:1,startMs:0,endMs:10000,muted:true,cursorVisible:false,cursorSize:24,clickHighlight:false,highlights:[cue],timeline:{layers:[{id:"base",kind:"video",enabled:true,locked:false,clips:[{id:"base-clip",startMs:0,endMs:10000,sourceStartMs:0}]},{id:"locked-layer",kind:"highlight",enabled:true,locked:true,highlightId:"locked-cue",clips:[{id:"locked-clip",startMs:0,endMs:10000,sourceStartMs:0}]}]}};w.__VIDEOS__=[clip];w.__VIDEO_DOCS__={[clip.id]:{clip,draft,pointer:[]}};if(library)w.__EMIT__("fershot-library-updated");else{w.__VIDEO_INBOX__=[{id:clip.id}];w.__EMIT__("fershot-video-open");}},{library,source});}
test("locked video annotations reject toolbar and keyboard deletion, unlock permits deletion",async({page})=>{
 await movie(page);await page.getByRole("button",{name:"Select Highlight layer",exact:true}).click();const remove=page.getByRole("button",{name:"Delete video highlight",exact:true});await expect(remove).toBeDisabled();await page.keyboard.press("Backspace");expect(await page.evaluate(()=>(window as any).__VIDEO_DOCS__["video-regression"].draft.highlights.length)).toBe(1);await page.getByRole("button",{name:"Unlock Highlight layer",exact:true}).click();await expect(remove).toBeEnabled();await remove.click();await expect.poll(()=>page.evaluate(()=>(window as any).__VIDEO_DOCS__["video-regression"].draft.highlights.length)).toBe(0);
});
test("video upload starts even when copying its link fails",async({page})=>{
 await movie(page);await expect(page.getByRole("button",{name:"Upload video",exact:true})).toBeEnabled();await page.evaluate(()=>(window as any).__FAIL_COPY__=true);await page.getByRole("button",{name:"Upload video",exact:true}).click();await expect.poll(()=>calls(page,"ftp_start")).toHaveLength(1);expect(await calls(page,"copy_text")).toHaveLength(1);await expect.poll(()=>calls(page,"hide_workspace")).toHaveLength(1);await expect.poll(()=>calls(page,"release_recording_editor")).not.toHaveLength(0);
});
test("unrelated Library refresh preserves the video player; actual draft revision reloads it",async({page})=>{
 await movie(page,true);await page.getByRole("tab",{name:/Local/}).click();await page.getByRole("option",{name:/Synthetic.mp4/}).click();await expect(page.locator(".library-video-preview video")).toHaveCount(1);await page.evaluate(()=>(window as any).__PLAYER__=document.querySelector(".library-video-preview video"));const before=(await calls(page,"recording_document")).length;await page.evaluate(()=>(window as any).__EMIT__("fershot-ftp-updated"));await page.waitForTimeout(300);expect((await calls(page,"recording_document")).length).toBe(before);expect(await page.evaluate(()=>(window as any).__PLAYER__===document.querySelector(".library-video-preview video"))).toBe(true);await page.evaluate(()=>{const w=window as any;w.__VIDEOS__[0].revision="r2";w.__EMIT__("fershot-library-updated");});await expect.poll(async()=>(await calls(page,"recording_document")).length).toBe(before+1);
});
test("completed captures and native close release document URLs instead of accumulating sessions",async({page})=>{
 await mock(page);await page.addInitScript(()=>{const original=URL.revokeObjectURL;const w=window as any;w.__REVOKED__=[];URL.revokeObjectURL=value=>{w.__REVOKED__.push(value);original(value);};});await page.goto("/?editor");await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.some((row:any)=>row.command==="plugin:event|listen"&&row.args.event==="fershot-menu-action"))).toBe(true);for(let index=0;index<35;index++){await page.evaluate(()=>(window as any).__EMIT__("fershot-menu-action","capture-area"));await expect.poll(async()=>(await calls(page,"show_editor")).length).toBe(index+1);await expect(page.getByRole("button",{name:"Copy image",exact:true})).toBeEnabled();}expect(await page.evaluate(()=>(window as any).__REVOKED__.length)).toBeGreaterThan(30);await page.evaluate(()=>(window as any).__EMIT__("fershot-editor-closed"));await expect(page.getByTestId("advanced-workbench-stage")).toHaveCount(0);
});

test("closing during a pending capture stays closed after the new result arrives",async({page})=>{
 await mock(page);
 await page.goto("/?editor");
 await expect.poll(async()=>(await calls(page,"plugin:event|listen")).some(call=>call.args.event==="fershot-menu-action")).toBe(true);
 await page.evaluate(()=>(window as any).__EMIT__("fershot-menu-action","capture-area"));
 await expect.poll(()=>calls(page,"show_editor")).toHaveLength(1);
 await page.evaluate(()=>{
  const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;
  w.__TAURI_INTERNALS__.invoke=async(command:string,args:unknown)=>{
   if(command==="capture_image")await new Promise<void>(resolve=>{w.__COMPLETE_CAPTURE__=resolve;});
   return invoke(command,args);
  };
  w.__EMIT__("fershot-menu-action","capture-area");
 });
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).__COMPLETE_CAPTURE__)).toBe("function");
 await page.evaluate(()=>{const w=window as any;w.__EMIT__("fershot-editor-closed");w.__COMPLETE_CAPTURE__();});
 await expect.poll(()=>calls(page,"capture_image")).toHaveLength(2);
 await expect(page.getByTestId("advanced-workbench-stage")).toHaveCount(0);
 expect(await calls(page,"show_editor")).toHaveLength(1);
});

test("a Local draft write failure keeps Edit open after copying pixels",async({page})=>{
 await mock(page);await page.addInitScript(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="local_cache_save_draft")throw{code:"cache_failed",message:"Local draft could not be saved."};return invoke(command,args);};});
 await page.goto("/?editor");
 await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.some((row:any)=>row.command==="plugin:event|listen"&&row.args.event==="fershot-menu-action"))).toBe(true);
 await page.evaluate(()=>(window as any).__EMIT__("fershot-menu-action","capture-area"));
 await page.getByRole("button",{name:"Copy image",exact:true}).click();
 await expect.poll(()=>calls(page,"copy_image")).toHaveLength(1);
 await expect(page.getByText("Local draft could not be saved.",{exact:true})).toBeVisible();
 expect(await calls(page,"hide_workspace")).toHaveLength(0);
 await expect(page.getByTestId("advanced-workbench-stage")).toHaveCount(1);
});
