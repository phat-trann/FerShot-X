// @vitest-environment jsdom
import {act,render,screen} from "@testing-library/react";
import {useSyncExternalStore} from "react";
import {describe,it,expect} from "vitest";
import {createPointerColor} from "./pointer-color";
describe("isolated pointer sampling",()=>{
 it("updates only the subscribed cell and skips unchanged colors",()=>{
  const source=createPointerColor();let parentRenders=0,cellRenders=0;
  function Cell(){cellRenders++;const value=useSyncExternalStore(source.subscribe,source.getSnapshot);return <output>{value}</output>;}
  function Parent(){parentRenders++;return <Cell/>;}
  render(<Parent/>);const initialParent=parentRenders;
  act(()=>source.set("#123456"));expect(screen.getByRole("status")).toHaveTextContent("#123456");expect(parentRenders).toBe(initialParent);const initialCell=cellRenders;
  act(()=>source.set("#123456"));expect(cellRenders).toBe(initialCell);
 });
});
