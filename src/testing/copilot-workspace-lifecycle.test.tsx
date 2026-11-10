// @vitest-environment jsdom
// Codex C67 supersedes the retired close/discard UI. Historical Copilot packets preserve its earlier cases.
import {beforeEach, describe, expect, it, vi} from "vitest";
const native=vi.hoisted(()=>({desktop:true,invoke:vi.fn()}));
vi.mock("@tauri-apps/api/core",()=>({isTauri:()=>native.desktop,invoke:native.invoke}));
import {hideWorkspace,quitApplication} from "../platform/native";
beforeEach(()=>{native.desktop=true;native.invoke.mockReset();native.invoke.mockResolvedValue(undefined);});
describe("macOS view lifecycle adapter",()=>{
 it("hides the view without invoking destructive close or quit",async()=>{await hideWorkspace();expect(native.invoke).toHaveBeenCalledWith("hide_workspace",{});expect(native.invoke).not.toHaveBeenCalledWith("quit_application",{});});
 it("quits only through its explicit separate command",async()=>{await quitApplication();expect(native.invoke).toHaveBeenCalledWith("quit_application",{});});
 it("browser hiding never invokes the native window",async()=>{native.desktop=false;await hideWorkspace();expect(native.invoke).not.toHaveBeenCalled();});
});
