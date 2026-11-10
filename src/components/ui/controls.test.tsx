// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Radio } from "./radio";
import { Slider } from "./slider";
import { Switch } from "./switch";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { NativeSelect } from "./select";

beforeEach(()=>vi.stubGlobal("ResizeObserver",class {observe(){}unobserve(){}disconnect(){}}));
afterEach(()=>vi.unstubAllGlobals());

describe("shared control behavior",()=>{
  it("keeps radio grouping, checked state and callbacks",()=>{const change=vi.fn();render(<><Radio aria-label="PNG" name="format" defaultChecked/><Radio aria-label="JPEG" name="format" onChange={change}/></>);fireEvent.click(screen.getByRole("radio",{name:"JPEG"}));expect(screen.getByRole("radio",{name:"JPEG"})).toBeChecked();expect(screen.getByRole("radio",{name:"PNG"})).not.toBeChecked();expect(change).toHaveBeenCalledOnce();});
  it("keeps scalar slider callbacks and fill synchronized with controlled values",()=>{
    const change=vi.fn(),native=vi.fn();
    const {rerender}=render(<Slider aria-label="Zoom" min={25} max={400} step={25} value={100} onValueChange={change} onChange={native}/>);
    const slider=screen.getByRole("slider",{name:"Zoom"});
    expect(slider.style.getPropertyValue("--slider-progress")).toBe("20%");
    fireEvent.change(slider,{target:{value:"200"}});
    expect(change).toHaveBeenCalledExactlyOnceWith(200);expect(native).toHaveBeenCalledOnce();
    rerender(<Slider aria-label="Zoom" min={25} max={400} value={400}/>);
    expect(slider).toHaveValue("400");expect(slider.style.getPropertyValue("--slider-progress")).toBe("100%");
  });
  it("supports uncontrolled slider values and native form submission",()=>{
    render(<form aria-label="Settings"><Slider name="quality" aria-label="Quality" defaultValue={25}/></form>);
    const slider=screen.getByRole("slider");fireEvent.change(slider,{target:{value:"75"}});
    expect(slider).toHaveValue("75");expect(slider.style.getPropertyValue("--slider-progress")).toBe("75%");
    expect(new FormData(screen.getByRole("form") as HTMLFormElement).get("quality")).toBe("75");
    fireEvent.reset(screen.getByRole("form"));expect(slider).toHaveValue("25");expect(slider.style.getPropertyValue("--slider-progress")).toBe("25%");
  });
  it("does not call slider or checkbox handlers inside a disabled fieldset",()=>{
    const change=vi.fn();render(<fieldset disabled><Slider aria-label="Quality" value={20} onValueChange={change}/><Checkbox aria-label="Include layer" onCheckedChange={change}/></fieldset>);
    fireEvent.change(screen.getByRole("slider"),{target:{value:"50"}});fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("slider")).toBeDisabled();expect(change).not.toHaveBeenCalled();
  });
  it("keeps Switch checked state, boolean callback and form semantics",()=>{
    const change=vi.fn(),submit=vi.fn();render(<form onSubmit={submit}><label><Switch name="secure" onCheckedChange={change}/>Require FTPS</label></form>);
    const toggle=screen.getByRole("switch",{name:"Require FTPS"});fireEvent.click(toggle);
    expect(toggle).toBeChecked();expect(toggle).toHaveAttribute("data-state","checked");expect(change).toHaveBeenCalledExactlyOnceWith(true);expect(submit).not.toHaveBeenCalled();
    fireEvent.click(toggle);expect(change).toHaveBeenLastCalledWith(false);
  });
  it("keeps item selection as checkbox semantics",()=>{
    const change=vi.fn();render(<label><Checkbox onCheckedChange={change}/>Include image</label>);
    fireEvent.click(screen.getByRole("checkbox",{name:"Include image"}));expect(change).toHaveBeenCalledExactlyOnceWith(true);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
  it("preserves input/select change events, constraints and form values",()=>{
    const change=vi.fn();render(<form aria-label="Export"><Input name="width" aria-label="Width" type="number" min={1} max={1000} value={100} onChange={change}/><NativeSelect name="format" aria-label="Format" defaultValue="png"><option value="png">PNG</option><option value="jpeg">JPEG</option></NativeSelect></form>);
    fireEvent.change(screen.getByRole("spinbutton"),{target:{value:"200"}});expect(change).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole("combobox"),{target:{value:"jpeg"}});
    expect(new FormData(screen.getByRole("form") as HTMLFormElement).get("format")).toBe("jpeg");expect(screen.getByRole("spinbutton")).toHaveAttribute("max","1000");
  });
});
