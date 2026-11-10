// @vitest-environment jsdom
import {act,renderHook} from "@testing-library/react";
import {beforeEach,describe,expect,it,vi} from "vitest";
const api=vi.hoisted(()=>({remove:vi.fn(),list:vi.fn()}));
vi.mock("../platform/local-cache",()=>({localCacheAvailable:()=>true,listLocalCache:api.list,removeLocalCache:api.remove,cachedLibraryDocument:vi.fn(),openLocalCache:vi.fn(),saveLocalDraft:vi.fn()}));
import {useLocalHistory} from "../Workspace.local-cache";
beforeEach(()=>{api.remove.mockReset().mockResolvedValue(true);api.list.mockReset().mockResolvedValue([]);});
describe("successful upload cache removal",()=>{
 it("coalesces simultaneous removals and skips already completed IDs",async()=>{
  const {result}=renderHook(()=>useLocalHistory());await act(async()=>{await Promise.all([result.current.forget("uploaded"),result.current.forget("uploaded")]);});await act(async()=>{await result.current.forget("uploaded");});expect(api.remove).toHaveBeenCalledTimes(1);
 });
 it("allows a failed removal to retry on a later queue update",async()=>{
  api.remove.mockRejectedValueOnce(new Error("synthetic cache busy"));const {result}=renderHook(()=>useLocalHistory());await act(async()=>{await result.current.forget("uploaded");});expect(result.current.error).toContain("Local history");await act(async()=>{await result.current.forget("uploaded");});expect(api.remove).toHaveBeenCalledTimes(2);
 });
});
