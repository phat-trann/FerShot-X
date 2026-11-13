import {beforeEach,describe,it,expect,vi} from "vitest";
const api=vi.hoisted(()=>({invoke:vi.fn().mockResolvedValue(undefined)}));
vi.mock("@tauri-apps/api/core",()=>({invoke:api.invoke,isTauri:()=>true}));
import {recordDiagnostic,logNativeOperation} from "./diagnostics";
beforeEach(()=>api.invoke.mockClear());
describe("technical diagnostic privacy boundary",()=>{
 it("retains scroll operation, exact allowed code and bounded duration",async()=>{logNativeOperation("capture_scroll_image",true,"scroll_no_movement",124.6);await Promise.resolve();expect(api.invoke).toHaveBeenCalledWith("record_diagnostic",{input:{area:"capture",event:"failed",code:"scroll_no_movement",operation:"capture_scroll_image",stage:"renderer_ipc",durationMs:125}});});
 it("retains explicit Library handoff operations",async()=>{for(const operation of ["take_editor_image","fit_editor_window","show_editor","listen_editor_image","editor_image_decode"])recordDiagnostic("image","failed","other",{operation,durationMs:1});await Promise.resolve();expect(api.invoke.mock.calls.map(row=>row[1].input.operation)).toEqual(["take_editor_image","fit_editor_window","show_editor","listen_editor_image","editor_image_decode"]);});
 it("never forwards arbitrary code or operation text into logs",async()=>{recordDiagnostic("image","failed","password=secret",{operation:"https://private.invalid/secret.png",durationMs:99999999});await Promise.resolve();const input=api.invoke.mock.calls[0][1].input;expect(input).toMatchObject({code:"other",operation:"unknown",durationMs:600000});expect(JSON.stringify(input)).not.toMatch(/secret|private|https/);});
 it("ignores successful and cancelled operations",async()=>{recordDiagnostic("capture","completed");recordDiagnostic("capture","failed","cancelled");await Promise.resolve();expect(api.invoke).not.toHaveBeenCalled();});
});
