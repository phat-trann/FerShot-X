import {test,expect} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";
test("Live Text action retains its slot while the preview is unavailable",async({page})=>{
 await mock(page);await page.addInitScript(()=>{const w=window as any;w.__MISSING_PREVIEW__=true;const invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>command==="live_text_supported"?true:invoke(command,args);});await page.goto("/");const button=page.getByRole("button",{name:"Live Text",exact:true});await expect(button).toBeVisible();await expect(button).toBeDisabled();
});
test("all capture and record-start events are ignored until recording ends",async({page})=>{
 await mock(page);await page.goto("/?editor");await page.waitForFunction(()=>typeof(window as any).__EMIT__==="function");await page.evaluate(()=>(window as any).__EMIT__("fershot-recording-state",{phase:"recording",elapsedMs:10}));
 const actions=["capture-fullscreen","capture-area","capture-window","capture-repeat-region","capture-active-window","capture-scrolling","record-screen","record-area"];
 for(const action of actions)await page.evaluate(action=>(window as any).__EMIT__("fershot-menu-action",action),action);
 await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.filter((r:any)=>["start_recording","capture_image","capture_repeat_area","capture_active_window","capture_scroll_image"].includes(r.command)).length)).toBe(0);
});
test("central diagnostics retain command metadata and preserve rejected IPC errors",async({page})=>{
 await mock(page);await page.addInitScript(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="live_text_layout")throw{code:"invalid_input",message:"private text not for logs"};return invoke(command,args);};Object.defineProperty(w.__TAURI_INTERNALS__,"invoke",{writable:false,configurable:false});});await page.goto("/");await page.evaluate(async()=>{try{await(await import("/src/platform/ipc.ts")).invoke("live_text_layout",{secret:"private payload"});}catch(error){(window as any).__ERROR_UNCHANGED__=(error as any).message;}});await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.filter((r:any)=>r.command==="record_diagnostic"&&r.args.input.operation==="live_text_layout").length)).toBe(1);const logs=await page.evaluate(()=>(window as any).__CALLS__.filter((r:any)=>r.command==="record_diagnostic"));expect(JSON.stringify(logs)).not.toContain("private");expect(await page.evaluate(()=>(window as any).__ERROR_UNCHANGED__)).toBe("private text not for logs");
});
