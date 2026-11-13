import {expect,test} from "@playwright/test";
import {installSettingsIpc} from "./helpers/v1-settings";

test("Settings sections stay open and share centered Hotkeys columns and compact text",async({page})=>{
 await installSettingsIpc(page);await page.goto("/?preferences");
 for(const width of [532,900]){
  await page.setViewportSize({width,height:637});
  for(const tab of ["General","Hotkeys","Uploading","Advanced","Updates"]){
   await page.getByRole("tab",{name:tab,exact:true}).click();const panel=page.locator('[role="tabpanel"]:visible');
   const box=(await panel.boundingBox())!;expect(box.width).toBeCloseTo(420,0);expect(box.x+box.width/2).toBeCloseTo(width/2,0);
   await expect(panel.locator("details,summary")).toHaveCount(0);
   const rows=panel.locator('.preference-row,.ui-field-label,.fershot-export-destination-panel__field,.fershot-shortcuts-v2-panel__row');
   expect(await rows.count()).toBeGreaterThan(0);
   const measurements=await rows.evaluateAll(nodes=>nodes.map(node=>{const children=[...node.children],label=children[0],control=children[1];return {name:node.textContent,display:getComputedStyle(node).display,labelSize:label?parseFloat(getComputedStyle(label).fontSize):null,controlLeft:control?.getBoundingClientRect().left};}));
   for(const row of measurements){expect(row.display,JSON.stringify(row)).toBe("grid");expect(row.labelSize).toBe(12);expect(row.controlLeft).toBeCloseTo(width/2,0);}
   expect(await page.locator('.preferences-content').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
   await page.screenshot({path:`artifacts/qa/C122-${width}-${tab.toLowerCase()}.png`,animations:"disabled"});
  }
 }
});
