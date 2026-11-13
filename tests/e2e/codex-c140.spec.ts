import {test,expect} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";

test("Library update bursts share a read and fetch trailing data without clearing the selected preview",async({page})=>{
 await mock(page);await page.goto("/");await expect(page.locator(".library-preview img")).toBeVisible();
 await page.evaluate(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__READS__=0;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="local_cache_list"){w.__READS__++;if(w.__READS__===1)await new Promise<void>(resolve=>{w.__RELEASE_READ__=resolve;});}return invoke(command,args);};w.__EMIT__("fershot-library-updated");});
 await expect.poll(()=>page.evaluate(()=>(window as any).__READS__)).toBe(1);
 await page.evaluate(()=>{const w=window as any;for(let i=0;i<20;i++){w.__EMIT__("fershot-library-updated");w.__EMIT__("fershot-ftp-updated");}});
 expect(await page.evaluate(()=>(window as any).__READS__)).toBe(1);
 await page.evaluate(()=>{(window as any).__RELEASE_READ__();});await expect.poll(()=>page.evaluate(()=>(window as any).__READS__)).toBe(2);
 await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected","true");await expect(page.locator(".library-preview img")).toBeVisible();
});
