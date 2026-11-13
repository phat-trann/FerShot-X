import {test,expect,type Page} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";

async function openSettings(page:Page){const pending=page.waitForEvent("popup");await page.evaluate(()=>window.open("/?preferences&tab=hotkeys","shortcut-settings"));const settings=await pending;await settings.setViewportSize({width:532,height:637});return settings;}

test("hotkey capsules match the seven-row layout and retain immediate assignments after reopening Settings",async({page})=>{
  await mock(page);await page.goto("/?editor");
  let settings=await openSettings(page);
  const full=()=>settings.getByRole("button",{name:"Record shortcut for Fullscreen screenshot",exact:true});
  await expect(full()).toBeEnabled();await full().click();await settings.keyboard.press("Meta+Shift+1");await expect(full()).toHaveText("⇧⌘1");
  await settings.getByRole("button",{name:"Record shortcut for Area screenshot",exact:true}).click();await settings.keyboard.press("Meta+Shift+2");
  await expect(settings.getByRole("button",{name:"Record shortcut for Area screenshot",exact:true})).toHaveText("⇧⌘2");
  await settings.close();settings=await openSettings(page);await expect(full()).toHaveText("⇧⌘1");
  await expect(settings.getByRole("button",{name:"Record shortcut for Area screenshot",exact:true})).toHaveText("⇧⌘2");
  await expect(settings.locator(".fershot-shortcuts-v2-panel__label")).toHaveText(["Fullscreen screenshot","Area screenshot","Repeat area screenshot","Any window screenshot","Active window screenshot","Scrolling screenshot","Show FerShot X"]);
  await expect(settings.locator(".shortcut-recorder")).toHaveCount(7);
  await expect(settings.getByRole("button",{name:"Record shortcut for Repeat area screenshot",exact:true})).toHaveCSS("color","rgb(164, 164, 168)");
  await expect(settings.getByRole("button",{name:/Install Shortcuts|Remove Shortcuts/})).toHaveCount(0);
  expect(await settings.locator(".preferences-content").evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
  await settings.screenshot({path:"artifacts/qa/C114-hotkey-rows.png",animations:"disabled"});
});

test("shortcut recovery is explicit and appears only for a faulted native registry",async({page})=>{
  await mock(page);await page.addInitScript(()=>{
    const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__BROKEN_SHORTCUTS__=true;
    w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{
      if(command==="get_shortcuts"){const status=await invoke(command,args);return {...status,faulted:w.__BROKEN_SHORTCUTS__};}
      if(command==="configure_shortcuts"){if(Object.values(args.bindings).some(value=>value!==null))throw {code:"shortcut_cleanup"};w.__BROKEN_SHORTCUTS__=false;}
      return invoke(command,args);
    };
  });await page.goto("/?preferences&tab=hotkeys");
  const reset=page.getByRole("button",{name:"Reset Shortcuts",exact:true});await expect(reset).toBeVisible();
  await expect(page.getByRole("button",{name:"Record shortcut for Area screenshot",exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>(window as any).__CALLS__.filter((call:any)=>call.command==="configure_shortcuts").length)).toBe(0);
  await reset.click();await expect(reset).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Record shortcut for Area screenshot",exact:true})).toBeEnabled();
});

test("pending shortcut writes are serialized and failed assignments/clears keep confirmed values",async({page})=>{
  await mock(page);await page.goto("/?preferences&tab=hotkeys");
  const full=page.getByRole("button",{name:"Record shortcut for Fullscreen screenshot",exact:true});
  await expect(full).toBeEnabled();await full.click();await page.keyboard.press("Meta+Shift+1");await expect(full).toHaveText("⇧⌘1");
  await page.evaluate(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__PENDING_WRITES__=0;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{
    if(command==="configure_shortcuts"){
      w.__PENDING_WRITES__++;
      if(w.__FAIL_SHORTCUT__)throw {code:w.__FAIL_SHORTCUT__};
      return new Promise((resolve,reject)=>{w.__FINISH_SHORTCUT__=()=>invoke(command,args).then(resolve,reject);});
    }return invoke(command,args);
  };});
  const area=page.getByRole("button",{name:"Record shortcut for Area screenshot",exact:true});
  await area.click();await page.keyboard.press("Meta+Shift+2");await expect(area).toHaveText("Saving…");await expect(full).toBeDisabled();
  await page.keyboard.press("Meta+Shift+3");expect(await page.evaluate(()=>(window as any).__PENDING_WRITES__)).toBe(1);
  await page.evaluate(()=>(window as any).__FINISH_SHORTCUT__());await expect(area).toHaveText("⇧⌘2");
  await page.evaluate(()=>{(window as any).__FAIL_SHORTCUT__="shortcut_conflict";});
  await area.click();await page.keyboard.press("Meta+Shift+3");await expect(page.getByLabel("Shortcut status")).toHaveText("A shortcut is already in use. Choose another key combination.");await expect(area).toHaveText("⇧⌘2");
  expect(await page.evaluate(()=>(window as any).__SAVED_SHORTCUTS__["capture-area"])).toBe("Super+Shift+Digit2");
  await page.evaluate(()=>{(window as any).__FAIL_SHORTCUT__="settings_failed";});
  await page.getByRole("button",{name:"Clear shortcut for Area screenshot",exact:true}).click();
  await expect(page.getByLabel("Shortcut status")).toContainText("could not be saved");await expect(area).toHaveText("⇧⌘2");
  expect(await page.evaluate(()=>(window as any).__ACTIVE_SHORTCUTS__["capture-fullscreen"])).toBe("Super+Shift+Digit1");
  expect(await page.evaluate(()=>(window as any).__ACTIVE_SHORTCUTS__["capture-area"])).toBe("Super+Shift+Digit2");
});
