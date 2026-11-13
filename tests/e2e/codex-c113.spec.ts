import { test, expect } from "@playwright/test";
import { mock } from "./helpers/v1-ipc";

test("Settings header icons and labels follow the latest scale and vertical gaps are halved without shrinking input targets", async ({ page }) => {
  await mock(page);
  await page.setViewportSize({width:532,height:637});
  await page.goto("/?preferences");
  await expect(page.locator('.preferences-tabs [role="tab"] svg')).toHaveCount(5);
  const icons=await page.locator('.preferences-tabs [role="tab"] svg').evaluateAll(nodes=>nodes.map(node=>({width:parseFloat(getComputedStyle(node).width),height:parseFloat(getComputedStyle(node).height)})));
  expect(icons).toHaveLength(5);
  for(const icon of icons){expect(icon.width).toBeCloseTo(25.92,1);expect(icon.height).toBeCloseTo(25.92,1);}
  await expect(page.locator('.preferences-content [role="tabpanel"]:visible')).toHaveCSS("row-gap","12px");
  await expect(page.getByRole("group",{name:"Capture & export",exact:true})).toHaveCSS("row-gap","6px");
  await expect(page.locator('.preference-row').first()).toHaveCSS("min-height","32px");
  await expect(page.getByRole("button",{name:"Done",exact:true})).toHaveCount(0);
  await expect(page.getByRole("tab",{name:"General",exact:true})).toHaveCSS("font-size","10.56px");
  await expect(page.getByRole("tab",{name:"General",exact:true})).toHaveCSS("color","rgb(37, 126, 254)");
  await page.screenshot({path:"artifacts/qa/C113-settings-general.png",animations:"disabled"});
  await page.getByRole("tab",{name:"Uploading",exact:true}).click();
  await expect(page.getByRole("group",{name:"FTP connection",exact:true})).toHaveCSS("row-gap","6px");
  await expect(page.getByRole("textbox",{name:"FTP host",exact:true})).toHaveCSS("height","32px");
  expect(await page.locator(".preferences-content").evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
  await page.screenshot({path:"artifacts/qa/C113-settings-uploading.png",animations:"disabled"});
});
