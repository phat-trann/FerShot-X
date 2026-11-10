import { useEffect, useRef, useState, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "./components/icons";

/** A portal keeps the modal outside the inert app shell, including older macOS WebKit. */
export function WorkspaceSettingsDialog({ children, label = "Settings", title = "Settings" }: { children: ReactNode; label?: string; title?: string }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const siblings = [...document.body.children].filter(node => node !== layer.current);
    const states = siblings.map(node => ({ node, inert: node.hasAttribute("inert"), hidden: node.getAttribute("aria-hidden") }));
    for (const { node } of states) { node.setAttribute("inert", ""); node.setAttribute("aria-hidden", "true"); }
    close.current?.focus();
    return () => {
      for (const { node, inert, hidden } of states) {
        if (!inert) node.removeAttribute("inert");
        if (hidden === null) node.removeAttribute("aria-hidden"); else node.setAttribute("aria-hidden", hidden);
      }
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);
  return <>
    <button className="settings-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog">{label}</button>
    {open && createPortal(<div className="settings-layer workspace" ref={layer} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary')].filter(node => node.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header><div><p className="eyebrow">YOUR WORKSPACE</p><h2 id={titleId}>{title}</h2></div>
          <button ref={close} className="icon-button" aria-label={label === "Settings" ? "Close settings" : "Close logs"} onClick={() => setOpen(false)}><IconClose size={18} /></button>
        </header>
        <div className="settings-dialog__content">{children}</div>
        <footer>Local data. Files leave this app only when you choose an output action.</footer>
      </section>
    </div>, document.body)}
  </>;
}
