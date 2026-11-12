// @vitest-environment jsdom
import {act,renderHook} from "@testing-library/react";
import {beforeEach,describe,expect,it,vi} from "vitest";
const api=vi.hoisted(()=>({remove:vi.fn(),list:vi.fn(),save:vi.fn()}));
vi.mock("../platform/local-cache",()=>({localCacheAvailable:()=>true,listLocalCache:api.list,removeLocalCache:api.remove,saveLocalDraft:api.save}));
import {useLocalHistory} from "../Workspace.local-cache";
beforeEach(()=>{api.remove.mockReset().mockResolvedValue(true);api.list.mockReset().mockResolvedValue([]);api.save.mockReset().mockResolvedValue({});});
describe("successful upload cache removal",()=>{
 it("coalesces simultaneous removals and skips already completed IDs",async()=>{
  const {result}=renderHook(()=>useLocalHistory());await act(async()=>{await Promise.all([result.current.forget("uploaded"),result.current.forget("uploaded")]);});await act(async()=>{await result.current.forget("uploaded");});expect(api.remove).toHaveBeenCalledTimes(1);
 });
 it("allows a failed removal to retry on a later queue update",async()=>{
  api.remove.mockRejectedValueOnce(new Error("synthetic cache busy"));const {result}=renderHook(()=>useLocalHistory());await act(async()=>{await result.current.forget("uploaded");});expect(result.current.error).toContain("Local history");await act(async()=>{await result.current.forget("uploaded");});expect(api.remove).toHaveBeenCalledTimes(2);
 });
});


const image={id:"image",name:"Synthetic.png",src:"blob:synthetic",width:20,height:20,byteSize:40,mimeType:"image/png" as const};
const draft={schemaVersion:1 as const,width:20,height:20,annotations:[],advanced:[]};
it("Edit no longer lists Local history on mount or periodically",async()=>{vi.useFakeTimers();try{const {unmount}=renderHook(()=>useLocalHistory());await act(async()=>{vi.advanceTimersByTime(120000);});expect(api.list).not.toHaveBeenCalled();unmount();}finally{vi.useRealTimers();}});
it("coalesces superseded queued drafts, skips unchanged saves and retains pixel identity",async()=>{const {result}=renderHook(()=>useLocalHistory());const latest={...draft,advanced:[]};await act(async()=>{await Promise.all([result.current.remember(image,draft),result.current.remember(image,latest)]);});expect(api.save).toHaveBeenCalledTimes(1);expect(api.save).toHaveBeenLastCalledWith(image,latest,true);await act(async()=>{await result.current.remember(image,{...latest});});expect(api.save).toHaveBeenCalledTimes(1);const edited={...latest,advanced:[]};await act(async()=>{await result.current.remember(image,edited);});expect(api.save).toHaveBeenLastCalledWith(image,edited,false);expect(api.save).toHaveBeenCalledTimes(2);});
it("failed draft writes remain retryable and retry their missing pixels",async()=>{api.save.mockRejectedValueOnce(new Error("synthetic disk error"));const {result}=renderHook(()=>useLocalHistory());await act(async()=>{await result.current.remember(image,draft);});expect(result.current.error).toContain("Local history");await act(async()=>{await result.current.remember(image,draft);});expect(api.save).toHaveBeenCalledTimes(2);expect(api.save).toHaveBeenLastCalledWith(image,draft,true);expect(result.current.error).toBe("");});


it("an awaited superseded save still waits for the latest queued draft to finish",async()=>{let release:()=>void=()=>{};api.save.mockImplementationOnce(()=>new Promise<void>(resolve=>{release=resolve;}));const {result}=renderHook(()=>useLocalHistory());let firstDone=false;const first=result.current.remember(image,draft).then(()=>{firstDone=true;});const latest=result.current.remember(image,{...draft,advanced:[]});await act(async()=>{await Promise.resolve();await Promise.resolve();});expect(api.save).toHaveBeenCalledTimes(1);expect(firstDone).toBe(false);await act(async()=>{release();await Promise.all([first,latest]);});expect(firstDone).toBe(true);});
