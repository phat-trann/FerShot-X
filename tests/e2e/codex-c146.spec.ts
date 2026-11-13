import {test,expect} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";
import {installSettingsIpc} from "./helpers/v1-settings";
test("equivalent framed actions keep stable hover borders, opacity and geometry across windows",async({page})=>{
 await installSettingsIpc(page);await page.goto("/?preferences");let checked=0;
 async function audit(){const buttons=page.locator('[data-slot="button"]:not([data-variant="plain"]):visible:enabled');for(const button of await buttons.all()){
 const before=await button.evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {border:s.borderColor,width:r.width,height:r.height};});await button.hover();await expect(button).toHaveCSS("border-color",before.border);await expect(button).toHaveCSS("opacity","1");const after=(await button.boundingBox())!;expect(after.width).toBe(before.width);expect(after.height).toBe(before.height);checked++;}}
 for(const tab of ["General","Uploading","Advanced","Updates"]){await page.getByRole("tab",{name:tab,exact:true}).click();await audit();}
 await mock(page);await page.goto("/");await expect(page.getByRole("option").first()).toBeVisible();await audit();await page.getByRole("tab",{name:/Local/}).click();await audit();expect(checked).toBeGreaterThan(6);
});
