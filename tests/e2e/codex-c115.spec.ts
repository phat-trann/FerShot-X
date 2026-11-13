import {test,expect} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";

test("native-style chrome has focus feedback, material hierarchy and accessible solid fallbacks",async({page})=>{
  await mock(page);await page.goto("/?preferences");
  const title=page.locator(".window-titlebar"),tabs=page.locator(".preferences-tabs");
  await expect(title).toBeVisible();await expect(tabs).toHaveCSS("backdrop-filter",/blur\(20px\)/);
  await expect(title).toHaveAttribute("data-tauri-drag-region","true");
  const titleBox=(await title.locator(".app-window-title").boundingBox())!;
  await page.evaluate(()=>window.dispatchEvent(new Event("blur")));
  await expect(page.locator("html")).toHaveAttribute("data-window-active","false");
  await expect(title.locator(".app-window-title")).toHaveCSS("color","rgb(222, 222, 223)");
  await expect(title.locator("img")).toHaveCSS("visibility","hidden");
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await expect(title.locator(".app-window-title")).toHaveCSS("color","rgb(255, 255, 255)");
  await expect(title.locator("img")).toHaveCSS("visibility","visible");
  expect(await title.locator(".app-window-title").boundingBox()).toEqual(titleBox);
  await page.emulateMedia({forcedColors:"active"});await expect(tabs).toHaveCSS("backdrop-filter","none");
  await page.emulateMedia({forcedColors:"none",reducedMotion:"reduce"});
  await expect(title.locator(".app-window-title")).toHaveCSS("transition-duration","0s");
  await page.screenshot({path:"artifacts/qa/C115-settings.png",animations:"disabled"});
});

test("Library distinguishes loading from empty content and offers real contextual actions",async({page})=>{
  await mock(page);await page.addInitScript(()=>{
    const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__LOCAL__=[];w.__FTP__=[];w.__RELEASE_LIST__=[];
    w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{
      const value=await invoke(command,args);
      if(command==="local_cache_list"||command==="ftp_list")return new Promise(resolve=>w.__RELEASE_LIST__.push(()=>resolve(value)));
      return value;
    };
  });await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");
  await expect(page.locator(".library-detail")).toHaveAttribute("aria-busy","true");
  await expect(page.locator(".library-preview").getByRole("status")).toHaveText("Loading library…");
  await expect(page.locator(".library-preview .ui-loading-state > span")).toHaveClass("sr-only");
  await expect(page.locator(".library-preview .ui-loading-state > span")).toHaveCSS("width","1px");
  await expect(page.locator(".library-preview .ui-loading-state > svg")).toBeVisible();
  await expect(page.locator(".library-preview .ui-loading-state svg")).toHaveCSS("animation-name","none");
  await expect(page.getByText("No FTP uploads yet.",{exact:true})).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).__RELEASE_LIST__.length)).toBeGreaterThanOrEqual(2);
  await page.evaluate(()=>(window as any).__RELEASE_LIST__.forEach((release:()=>void)=>release()));
  await expect(page.getByText("No FTP uploads yet.",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Edit image",exact:true})).toHaveCount(0);
  await expect(page.getByRole("group",{name:"Selected images",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Set Up FTP",exact:true}).click();
  expect(await page.evaluate(()=>(window as any).__CALLS__.filter((call:any)=>call.command==="open_preferences_window").at(-1).args)).toEqual({tab:"uploading"});
  await page.getByRole("tab",{name:/Local/}).click();
  await expect(page.getByText("Capture an image from the menu bar.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Set Up Shortcuts",exact:true}).click();
  expect(await page.evaluate(()=>(window as any).__CALLS__.filter((call:any)=>call.command==="open_preferences_window").at(-1).args)).toEqual({tab:"hotkeys"});
  await page.screenshot({path:"artifacts/qa/C115-library-empty.png",animations:"disabled"});
});

test("Edit popovers use layered material shadows without changing image geometry or blurring content",async({page})=>{
  await mock(page);await page.goto("/?editor");
  const png=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=400;c.height=240;c.getContext("2d")!.fillRect(0,0,400,240);return c.toDataURL().split(",")[1];});
  await page.locator('input[type="file"]').setInputFiles({name:"Material.png",mimeType:"image/png",buffer:Buffer.from(png,"base64")});
  const canvas=page.getByTestId("advanced-workbench-stage");await expect(canvas).toBeVisible();const before=(await canvas.boundingBox())!;
  await expect(page.locator(".editor-chrome")).toHaveCSS("backdrop-filter",/blur\(20px\)/);
  await page.getByRole("button",{name:"Image size",exact:true}).click();
  const panel=page.getByRole("region",{name:"Resize image",exact:true});
  await expect(panel).toHaveCSS("backdrop-filter",/blur\(20px\)/);await expect(panel).not.toHaveCSS("box-shadow","none");
  await expect(panel.getByRole("button",{name:"Crop Region",exact:true})).toHaveCount(0);
  const shadow=await panel.evaluate(node=>getComputedStyle(node).boxShadow);await page.getByLabel("Resize width").focus();await expect(panel).toHaveCSS("box-shadow",shadow);
  await expect(canvas).toHaveCSS("backdrop-filter","none");expect(await canvas.boundingBox()).toEqual(before);
  await page.screenshot({path:"artifacts/qa/C115-editor.png",animations:"disabled"});
  await page.keyboard.press("Escape");await expect(panel).toHaveCount(0);await expect(canvas).toBeVisible();
});

test("a failed collection read is recoverable and never masquerades as an empty Library",async({page})=>{
  await mock(page);await page.addInitScript(()=>{
    const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__FAIL_LIST__=true;
    w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="ftp_list"&&w.__FAIL_LIST__)throw {code:"ftp_connection",message:"Could not read library."};return invoke(command,args);};
  });await page.goto("/");
  await expect(page.getByRole("button",{name:"Retry Library",exact:true})).toBeVisible();
  await expect(page.getByText("No FTP uploads yet.",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Set Up FTP",exact:true})).toHaveCount(0);
  await page.evaluate(()=>{(window as any).__FAIL_LIST__=false;});
  await page.getByRole("button",{name:"Retry Library",exact:true}).click();
  await expect(page.getByRole("img",{name:"Shared.png",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Edit image",exact:true})).toBeEnabled();
});

test("Library navigation retains native title chrome and keeps selection actions on one compact row",async({page})=>{
  await mock(page);await page.goto("/");await expect(page.getByRole("img",{name:"Shared.png",exact:true})).toBeVisible();
  await page.getByRole("tab",{name:/Local/}).click();await page.getByRole("tab",{name:/FTP/}).click();
  await page.getByRole("option",{name:/frozen.png/}).click();
  const title=(await page.locator(".window-titlebar").boundingBox())!;
  expect(title.y).toBe(0);expect(await page.evaluate(()=>window.scrollY)).toBe(0);
  const actions=(await page.getByRole("group",{name:"Selected images",exact:true}).boundingBox())!;
  expect(actions.height).toBeLessThanOrEqual(50);
  await page.screenshot({path:"artifacts/qa/C115-library.png",animations:"disabled"});
});
