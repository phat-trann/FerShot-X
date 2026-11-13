import {test,expect,type Page} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";
async function setup(page:Page,uploading=false){
  await mock(page);await page.addInitScript(({uploading})=>{const w=window as any,now=Date.now();w.__FTP__=[0,1,2].map(i=>({id:`ftp-${i}`,sourceId:`source-${i}`,name:`Image${i}.png`,remotePath:`/s/image${i}.png`,url:`https://example.invalid/s/image${i}.png`,status:uploading&&i===1?"uploading":"success",createdAt:now-i*1000,updatedAt:now}));},{uploading});
  await page.goto("/");await expect(page.getByRole("option")).toHaveCount(3);
}
async function calls(page:Page,command:string){return page.evaluate(command=>(window as any).__CALLS__.filter((call:any)=>call.command===command),command);}

test("FTP history removal works for multiple selected rows without deleting server files or Local images",async({page})=>{
  await setup(page);await page.setViewportSize({width:800,height:540});
  const rows=page.getByRole("option"),preview=page.getByRole("region",{name:"Image preview",exact:true});
  await rows.first().click();await rows.nth(2).click({modifiers:["Meta"]});
  await expect(page.getByRole("option",{selected:true})).toHaveCount(2);
  const actions=page.getByRole("group",{name:"Selected images",exact:true});
  await expect(actions.getByRole("button",{name:"Remove history",exact:true})).toBeEnabled();
  await expect(preview.getByRole("button",{name:/Copy URL|Delete from FTP|Remove history|Remove cached copy/})).toHaveCount(0);
  expect((await actions.boundingBox())!.height).toBeLessThanOrEqual(50);
  await page.screenshot({path:"artifacts/qa/C118-ftp-selection.png",animations:"disabled"});
  await actions.getByRole("button",{name:"Remove history",exact:true}).click();
  await expect(page.getByRole("option")).toHaveCount(1);
  expect((await calls(page,"ftp_remove")).map((call:any)=>call.args.id)).toEqual(["ftp-0","ftp-2"]);
  expect(await calls(page,"ftp_delete_remote")).toHaveLength(0);expect(await calls(page,"local_cache_remove")).toHaveLength(0);
  expect(await page.evaluate(()=>(window as any).__FTP__.map((item:any)=>item.id))).toEqual(["ftp-1"]);
  await page.getByRole("tab",{name:/Local/}).click();await expect(page.getByRole("option")).toHaveCount(2);
  await expect(preview.getByRole("button",{name:/Copy images|Delete selected|Remove cached copy/})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Copy images",exact:true})).toHaveCount(1);
  await expect(page.getByRole("button",{name:"Delete selected",exact:true})).toHaveCount(1);
  await expect(page.getByRole("button",{name:"Edit image",exact:true})).toHaveCount(1);
});

test("partial history failures retain failed selections and retry never repeats completed removals",async({page})=>{
  await setup(page);await page.evaluate(()=>{(window as any).__FAIL_DELETE_ID__="ftp-1";});
  await page.getByRole("option").first().click();await page.keyboard.press("Meta+a");
  await page.getByRole("button",{name:"Remove history",exact:true}).click();
  await expect(page.getByRole("alert").first()).toContainText("Synthetic delete failure");
  await expect(page.getByRole("option",{selected:true})).toHaveCount(2);
  expect((await calls(page,"ftp_remove")).map((call:any)=>call.args.id)).toEqual(["ftp-0","ftp-1"]);
  await page.evaluate(()=>{(window as any).__FAIL_DELETE_ID__=null;});
  await page.getByRole("button",{name:"Remove history",exact:true}).click();await expect(page.getByRole("option")).toHaveCount(0);
  expect((await calls(page,"ftp_remove")).map((call:any)=>call.args.id)).toEqual(["ftp-0","ftp-1","ftp-1","ftp-2"]);
  expect(await calls(page,"ftp_delete_remote")).toHaveLength(0);
});

test("uploading selections cannot be removed from history or deleted remotely",async({page})=>{
  await setup(page,true);await page.getByRole("option").first().click();await page.keyboard.press("Meta+a");
  await expect(page.getByRole("button",{name:"Remove history",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Delete selected from FTP",exact:true})).toBeDisabled();
  expect(await calls(page,"ftp_remove")).toHaveLength(0);expect(await calls(page,"ftp_delete_remote")).toHaveLength(0);
});
