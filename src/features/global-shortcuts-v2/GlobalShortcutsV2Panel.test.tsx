// @vitest-environment jsdom
import {render,screen,fireEvent} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {GlobalShortcutsV2Panel} from "./GlobalShortcutsV2Panel";
import {emptyGlobalBindingsV2} from "./types";

it("records physical Shift-digit/Option-letter keys once and preserves the other bindings",()=>{
  const change=vi.fn(),value={...emptyGlobalBindingsV2(),"capture-area":{key:"a",metaKey:true,ctrlKey:false,altKey:false,shiftKey:true}};
  const {rerender}=render(<GlobalShortcutsV2Panel value={value} disabled={false} onChange={change}/>);
  fireEvent.click(screen.getByRole("button",{name:"Record shortcut for Fullscreen screenshot"}));
  fireEvent.keyDown(window,{key:"!",code:"Digit1",shiftKey:true,metaKey:true});
  expect(change).toHaveBeenCalledOnce();expect(change.mock.calls[0][0]["capture-fullscreen"]).toEqual({key:"1",metaKey:true,ctrlKey:false,altKey:false,shiftKey:true});expect(change.mock.calls[0][0]["capture-area"]).toEqual(value["capture-area"]);
  rerender(<GlobalShortcutsV2Panel value={change.mock.calls[0][0]} disabled={false} onChange={change}/>);
  expect(screen.getByRole("button",{name:"Record shortcut for Fullscreen screenshot"})).toHaveTextContent("⇧⌘1");
  fireEvent.click(screen.getByRole("button",{name:"Record shortcut for Active window screenshot"}));
  fireEvent.keyDown(window,{key:"å",code:"KeyA",altKey:true});
  expect(change).toHaveBeenCalledTimes(2);expect(change.mock.calls[1][0]["capture-active-window"]).toEqual({key:"a",metaKey:false,ctrlKey:false,altKey:true,shiftKey:false});
});

it("Escape, Tab, focus loss and invalid/duplicate input never write shortcuts",()=>{
  const change=vi.fn(),value={...emptyGlobalBindingsV2(),"capture-area":{key:"a",metaKey:true,ctrlKey:false,altKey:false,shiftKey:true}};
  render(<GlobalShortcutsV2Panel value={value} disabled={false} onChange={change}/>);
  const record=screen.getByRole("button",{name:"Record shortcut for Fullscreen screenshot"});
  fireEvent.click(record);fireEvent.keyDown(window,{key:"a",code:"KeyA",metaKey:true,shiftKey:true});expect(screen.getByRole("alert")).toHaveTextContent(/already assigned/);
  fireEvent.keyDown(window,{key:"Escape"});expect(record).toHaveAttribute("aria-pressed","false");
  fireEvent.click(record);fireEvent.keyDown(window,{key:"q",code:"KeyQ",metaKey:true});expect(screen.getByRole("alert")).toHaveTextContent(/reserved/);
  fireEvent.keyDown(window,{key:"Tab"});expect(record).toHaveAttribute("aria-pressed","false");
  fireEvent.click(record);fireEvent.keyDown(window,{key:"1",code:"Digit1",repeat:true,metaKey:true});expect(change).not.toHaveBeenCalled();
  fireEvent.blur(window);expect(record).toHaveAttribute("aria-pressed","false");
  expect(change).not.toHaveBeenCalled();
});

it("clears only the requested row and prevents edits while disabled",()=>{
  const change=vi.fn(),binding={key:"1",metaKey:true,ctrlKey:false,altKey:false,shiftKey:true};
  const value={...emptyGlobalBindingsV2(),"capture-fullscreen":binding,"capture-area":{...binding,key:"2"}};
  const {rerender}=render(<GlobalShortcutsV2Panel value={value} disabled={false} onChange={change}/>);
  fireEvent.click(screen.getByRole("button",{name:"Clear shortcut for Fullscreen screenshot"}));
  expect(change).toHaveBeenCalledOnce();expect(change.mock.calls[0][0]["capture-fullscreen"]).toBeNull();expect(change.mock.calls[0][0]["capture-area"]).toEqual(value["capture-area"]);
  rerender(<GlobalShortcutsV2Panel value={value} disabled onChange={change}/>);
  fireEvent.click(screen.getByRole("button",{name:"Clear shortcut for Area screenshot"}));expect(change).toHaveBeenCalledOnce();
});
