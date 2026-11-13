import {expect,test} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";

test("Edit and Resize use the entire space below the toolbar with no inset frame",async({page})=>{
 await mock(page);await page.goto("/?editor");
 for(const size of [{width:1800,height:600},{width:600,height:1800}]){
  const png=await page.evaluate(size=>{const c=document.createElement("canvas");c.width=size.width;c.height=size.height;const ctx=c.getContext("2d")!;ctx.fillStyle="#257efe";ctx.fillRect(0,0,c.width,c.height);return c.toDataURL().split(",")[1];},size);
  await page.locator('input[type="file"]').setInputFiles({name:"Full-area.png",mimeType:"image/png",buffer:Buffer.from(png,"base64")});
  await page.getByRole("button",{name:"Zoom controls",exact:true}).click();await page.getByRole("button",{name:"Fit",exact:true}).click();const region=page.getByRole("region",{name:"Image workspace",exact:true});
  const body=(await page.locator('.workspace-body').boundingBox())!,clip=(await region.boundingBox())!,toolbar=(await page.locator('.editor-chrome').boundingBox())!;
  expect(clip).toEqual(body);expect(clip.x).toBe(0);expect(clip.width).toBe(1180);expect(clip.y).toBeCloseTo(toolbar.y+toolbar.height,0);expect(clip.y+clip.height).toBe(780);
  await expect(region).toHaveCSS("padding","0px");await expect(region).toHaveCSS("border-top-width","0px");await expect(region).toHaveCSS("border-radius","0px");
  await expect.poll(async()=>{const canvas=(await page.getByTestId("advanced-workbench-stage").boundingBox())!;return Math.min(Math.abs(canvas.width-clip.width),Math.abs(canvas.height-clip.height));}).toBeLessThan(1);
  const box=(await page.getByTestId("advanced-workbench-stage").boundingBox())!;expect(box.width/box.height).toBeCloseTo(size.width/size.height,2);
  await page.getByRole("button",{name:"Image size",exact:true}).click();await expect(page.getByRole("region",{name:"Resize image",exact:true})).toBeVisible();expect(await region.boundingBox()).toEqual(clip);await page.keyboard.press("Escape");await expect(page.getByTestId("advanced-workbench-stage")).toBeVisible();
  await page.screenshot({path:`artifacts/qa/C125-${size.width>size.height?"wide":"tall"}.png`,animations:"disabled"});
 }
});
