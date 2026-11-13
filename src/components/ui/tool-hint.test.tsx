// @vitest-environment jsdom
import {createRef} from "react";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {ToolHint} from "./tool-hint";
import {Button} from "./button";
afterEach(cleanup);
it("asChild preserves refs, callbacks and existing accessibility descriptions",()=>{
 const ref=createRef<HTMLButtonElement>(),key=vi.fn(),pointer=vi.fn(),focus=vi.fn(),hover=vi.fn();
 const {unmount}=render(<ToolHint label="Action" asChild><Button ref={ref} aria-describedby="context" aria-keyshortcuts="Meta+K" onKeyDown={key} onPointerDown={pointer} onFocus={focus} onMouseEnter={hover}>Run</Button></ToolHint>);
 const button=screen.getByRole("button");expect(ref.current).toBe(button);fireEvent.focus(button);expect(focus).toHaveBeenCalledTimes(1);
 expect(button.getAttribute("aria-describedby")).toContain("context");expect(button.getAttribute("aria-describedby")).toContain(screen.getByRole("tooltip").id);
 expect(button.getAttribute("aria-keyshortcuts")).toBe("Meta+K");fireEvent.keyDown(button,{key:"Escape"});expect(key).toHaveBeenCalledTimes(1);expect(screen.queryByRole("tooltip")).toBeNull();expect(button.getAttribute("aria-describedby")).toBe("context");
 fireEvent.mouseEnter(button);expect(hover).toHaveBeenCalledTimes(1);fireEvent.pointerDown(button);expect(pointer).toHaveBeenCalledTimes(1);expect(screen.queryByRole("tooltip")).toBeNull();unmount();expect(ref.current).toBeNull();
});
it("wrapped controls retain callbacks and keyboard descriptions",()=>{
 const click=vi.fn();render(<ToolHint label="Wrapped"><Button aria-describedby="context" onClick={click}>Wrapped</Button></ToolHint>);const button=screen.getByRole("button");fireEvent.focus(button);expect(button.getAttribute("aria-describedby")).toContain("context");fireEvent.click(button);expect(click).toHaveBeenCalledTimes(1);
});
