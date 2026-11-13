// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {RefreshCw} from "lucide-react";
import {CheckboxField} from "../components/ui/field";
import {Button} from "../components/ui/button";
afterEach(cleanup);
it("links a control-first checkbox label and keeps adjacent actions from toggling it",()=>{
 const change=vi.fn(),retry=vi.fn();render(<CheckboxField label="Launch at startup" checked={false} onCheckedChange={change} action={<Button icon={RefreshCw} aria-label="Retry" onClick={retry}/>}/>);
 const checkbox=screen.getByRole("checkbox",{name:"Launch at startup"});fireEvent.click(screen.getByText("Launch at startup"));expect(change).toHaveBeenCalledWith(true);
 change.mockClear();fireEvent.click(screen.getByRole("button",{name:"Retry"}));expect(retry).toHaveBeenCalledTimes(1);expect(change).not.toHaveBeenCalled();
 expect(checkbox.compareDocumentPosition(screen.getByText("Launch at startup"))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it("preserves native disabled-fieldset behavior",()=>{
 const change=vi.fn();render(<fieldset disabled><CheckboxField label="FTPS" checked={false} onCheckedChange={change}/></fieldset>);
 fireEvent.click(screen.getByText("FTPS"));expect(change).not.toHaveBeenCalled();expect(screen.getByRole("checkbox").matches(":disabled")).toBe(true);
});
