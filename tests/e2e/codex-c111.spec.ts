import { test, expect } from "@playwright/test";
import { mock } from "./helpers/v1-ipc";

test("compact Settings keeps first controls inset, regular row gaps and control-first checkboxes in every tab", async ({page}) => {
  await mock(page);
  await page.setViewportSize({width:532,height:637});
  await page.goto("/?preferences");
  const tabs=page.locator(".preferences-tabs");
  const tabBox=(await tabs.boundingBox())!, firstTab=(await page.getByRole("tab",{name:"General",exact:true}).boundingBox())!;
  expect(firstTab.y-tabBox.y).toBeGreaterThanOrEqual(12);
  for(const tab of ["General","Advanced","Uploading"]){
    await page.getByRole("tab",{name:tab,exact:true}).click();
    const panel=page.locator('[role="tabpanel"]:visible');
    await expect(panel.locator("fieldset").first()).toBeVisible();
    const contentBox=(await page.locator(".preferences-content").boundingBox())!, fieldsetBox=(await panel.locator("fieldset").first().boundingBox())!;
    expect(fieldsetBox.y-contentBox.y).toBeGreaterThanOrEqual(20);
    const fields=panel.locator(".ui-checkbox-field");
    for(let i=0;i<await fields.count();i++){
      const row=fields.nth(i);await row.scrollIntoViewIfNeeded();
      const label=(await row.locator(".ui-checkbox-field-label > label").boundingBox())!, control=(await row.getByRole("checkbox").boundingBox())!;
      expect(control.x+control.width).toBeLessThanOrEqual(label.x-8);
      expect(Math.abs(label.y+label.height/2-control.y-control.height/2)).toBeLessThan(1);
    }
  }
  const month=page.getByRole("checkbox",{name:"Group uploads by month",exact:true});
  const secure=page.getByRole("checkbox",{name:"Require explicit TLS (FTPS)",exact:true});
  await month.click();await expect(month).toBeChecked();await secure.click();await expect(secure).toBeChecked();
  const gaps=await page.locator('section[aria-label="FTP publishing settings"] > form > fieldset').evaluate(element=>{
    const children=Array.from(element.children).map(child=>child.getBoundingClientRect());
    return children.slice(1).map((child,index)=>child.top-children[index].bottom);
  });
  expect(gaps.every(gap=>gap>=5.5)).toBe(true);
  await expect(page.locator('section[aria-label="FTP publishing settings"] input').first()).toHaveCSS("border-radius","12px");
  expect(await page.locator(".preferences-content").evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  await page.screenshot({path:"artifacts/qa/C111-settings-uploading.png"});
});
