import {test,expect} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";
test("Updates real available state aligns version columns",async({page})=>{
 await mock(page);await page.addInitScript(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=(command:string,args:any)=>command==="read_update_state"?Promise.resolve({phase:"available",availableVersion:"9.9.9",downloaded:0,total:null,error:null}):invoke(command,args);});await page.goto("/?preferences&tab=updates");
 const current=page.locator(".preference-row").filter({has:page.getByText("Current version",{exact:true})});
 const next=page.getByRole("status",{name:"Update version status"});
 await expect(next).toBeVisible();await expect(next.getByRole("button",{name:"Install Update"})).toBeEnabled();
 const a=await current.locator("strong").boundingBox(),b=await next.locator("strong").boundingBox();expect(Math.abs(a!.x-b!.x)).toBeLessThan(1);
 await page.screenshot({path:"artifacts/qa/C144-updates-preview.png"});
 expect(await page.evaluate(()=>(window as any).__CALLS__.some((c:any)=>c.command==="request_update"&&c.args.action==="apply"))).toBe(false);
});

test("Updates without an available version has no simulated New version row",async({page})=>{await mock(page);await page.goto("/?preferences&tab=updates");await expect(page.getByText("Current version",{exact:true})).toBeVisible();await expect(page.getByRole("status",{name:"Update version status"})).toHaveCount(0);});
