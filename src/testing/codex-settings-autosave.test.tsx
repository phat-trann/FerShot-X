// @vitest-environment jsdom
import {act,cleanup,renderHook} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {flushSettings,useSettingsAutosave} from "../use-settings-autosave";

afterEach(()=>{cleanup();vi.useRealTimers();});
describe("Settings autosave",()=>{
 it("does not write on mount and coalesces rapid changes",async()=>{
  vi.useFakeTimers();const save=vi.fn(async(_value:number)=>{}),error=vi.fn();const {result}=renderHook(()=>useSettingsAutosave(save,error));
  await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});expect(save).not.toHaveBeenCalled();
  act(()=>{result.current.schedule(1);result.current.schedule(2);});
  await act(async()=>{await vi.advanceTimersByTimeAsync(300);});expect(save.mock.calls).toEqual([[2]]);expect(error).not.toHaveBeenCalled();
 });
 it("serializes slow saves and retains the latest changes made in flight",async()=>{
  let resolve!:()=>void;const save=vi.fn((n:number)=>n===1?new Promise<void>(done=>{resolve=done;}):Promise.resolve());
  const {result}=renderHook(()=>useSettingsAutosave(save,vi.fn()));let done!:Promise<void>;
  await act(async()=>{result.current.schedule(1);done=result.current.flush();await Promise.resolve();});
  act(()=>{result.current.schedule(2);result.current.schedule(3);});expect(save.mock.calls).toEqual([[1]]);
  await act(async()=>{resolve();await done;});expect(save.mock.calls).toEqual([[1],[3]]);
 });
 it("retains failed snapshots for explicit retry and propagates close failures",async()=>{
  const failure=new Error("Synthetic disk failure"),save=vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined),error=vi.fn();
  const {result}=renderHook(()=>useSettingsAutosave(save,error));
  await act(async()=>{result.current.schedule(4);await expect(flushSettings()).rejects.toBe(failure);});expect(error).toHaveBeenCalledWith(failure);
  await act(async()=>{await flushSettings();});expect(save.mock.calls).toEqual([[4],[4]]);
 });
 it("serializes separate Settings sections that share the native operation guard",async()=>{
  let resolve!:()=>void;const order:string[]=[];
  const first=renderHook(()=>useSettingsAutosave(async(n:number)=>{order.push(`first:${n}`);await new Promise<void>(done=>{resolve=done;});},vi.fn()));
  const second=renderHook(()=>useSettingsAutosave(async(n:number)=>{order.push(`second:${n}`);},vi.fn()));
  let done!:Promise<void>;
  await act(async()=>{first.result.current.schedule(1);second.result.current.schedule(2);done=flushSettings();await Promise.resolve();});
  expect(order).toEqual(["first:1"]);await act(async()=>{resolve();await done;});expect(order).toEqual(["first:1","second:2"]);
 });
 it("cancels queued valid snapshots when the current input is invalid",async()=>{
  const save=vi.fn(async(_value:number)=>{}),error=vi.fn(),{result}=renderHook(()=>useSettingsAutosave(save,error));
  await act(async()=>{result.current.schedule(7);result.current.schedule(null);await expect(result.current.flush()).rejects.toThrow("valid settings");});expect(save).not.toHaveBeenCalled();
  await act(async()=>{result.current.schedule(8);await result.current.flush();});expect(save.mock.calls).toEqual([[8]]);
 });
 it("flushes pending changes on window blur and unmount",async()=>{
  const save=vi.fn(async(_value:number)=>{}),{result,unmount}=renderHook(()=>useSettingsAutosave(save,vi.fn()));
  await act(async()=>{result.current.schedule(9);window.dispatchEvent(new Event("blur"));await Promise.resolve();});expect(save.mock.calls).toEqual([[9]]);
  act(()=>result.current.schedule(10));unmount();await act(async()=>{await Promise.resolve();});expect(save.mock.calls).toEqual([[9],[10]]);
 });
});
