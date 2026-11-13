import {expect,test} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";

test("Edit tools are flat at rest, resize spacing stays compact and the color picker is a full square",async({page})=>{
 await mock(page);await page.goto("/?editor");
 const png=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=400;c.height=240;const ctx=c.getContext("2d")!;ctx.fillStyle="#eee";ctx.fillRect(0,0,400,240);return c.toDataURL().split(",")[1];});
 await page.locator('input[type="file"]').setInputFiles({name:"Tools.png",mimeType:"image/png",buffer:Buffer.from(png,"base64")});
 const rectangle=page.getByRole("button",{name:"rectangle tool",exact:true});await rectangle.click();await page.mouse.move(0,0);
 for(const name of ["rectangle tool","Copy image","Save image…"]){const tool=page.getByRole("button",{name,exact:true});await expect(tool).toHaveCSS("background-color","rgba(0, 0, 0, 0)");await expect(tool).toHaveCSS("border-top-color","rgba(0, 0, 0, 0)");}
 await expect(rectangle).toHaveCSS("color","rgb(37, 126, 254)");await rectangle.hover();await expect(rectangle).not.toHaveCSS("background-color","rgba(0, 0, 0, 0)");await page.mouse.move(0,0);
 const stage=page.getByTestId("advanced-workbench-stage"),b=(await stage.boundingBox())!;await page.mouse.move(b.x+40,b.y+40);await page.mouse.down();await page.mouse.move(b.x+180,b.y+100);await page.mouse.up();
 const picker=page.getByLabel("Element color",{exact:true});await picker.fill("#257efe");await expect(picker).toHaveValue("#257efe");const box=(await picker.boundingBox())!;expect(box.width).toBe(32);expect(box.height).toBe(32);await expect(picker).toHaveCSS("padding","0px");await expect(picker).toHaveCSS("border-radius","0px");
 expect(await picker.evaluate(el=>getComputedStyle(el,"::-webkit-color-swatch").borderRadius)).toBe("0px");await page.screenshot({path:"artifacts/qa/C123-square-color.png",animations:"disabled"});
 await page.getByRole("button",{name:"Image size",exact:true}).click();await page.mouse.move(0,0);const popover=page.getByRole("region",{name:"Resize image",exact:true});
 await expect(popover).toBeVisible();await expect(popover.locator("svg")).toHaveCount(0);await expect(popover.getByRole("button",{name:/Crop Region|Cancel/})).toHaveCount(0);
 const presets=(await page.locator('.editor-size-presets').boundingBox())!,fields=(await page.locator('.editor-size-fields').boundingBox())!;expect(fields.y-presets.y-presets.height).toBe(10);expect(await popover.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.getByRole("button",{name:"Resize",exact:true}).hover();await page.mouse.move(0,0);await page.screenshot({path:"artifacts/qa/C123-crop-spacing.png",animations:"disabled"});await page.keyboard.press("Escape");await expect(popover).toHaveCount(0);await expect(stage).toBeVisible();
});
