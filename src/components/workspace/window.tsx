"use client";

import { memo, useEffect, useRef, type ReactNode, type PointerEvent, type KeyboardEvent, type Dispatch } from "react";
import { Maximize2, Minus, X, PanelTop, Move } from "lucide-react";
import { gestureRect, titles, type Bounds, type Rect, type WindowState, type WorkspaceAction } from "@/lib/workspace-model";

export type WindowProps = { window: WindowState; bounds: Bounds; mobile: boolean; active: boolean; dispatch: Dispatch<WorkspaceAction>; children: ReactNode };
export const WorkWindow = memo(function WorkWindow({ window: win, bounds, mobile, active, dispatch, children }: WindowProps) {
  const element = useRef<HTMLElement>(null);
  const gesture = useRef<{ pointer: number; x: number; y: number; start: Rect; rect: Rect; handle: string } | null>(null);
  const frame = useRef<number | null>(null);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const paint = (rect: Rect) => {
    if (!element.current) return;
    Object.assign(element.current.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  };
  const begin = (event: PointerEvent<HTMLElement>, handle: string) => {
    if (mobile || win.maximized || event.button !== 0 || (event.target as HTMLElement).closest("button,input,select,a")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dispatch({ type: "focus", id: win.id });
    gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, start: win, rect: win, handle };
    element.current?.classList.add("moving");
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    current.rect = gestureRect(current.start, event.clientX - current.x, event.clientY - current.y, current.handle, bounds);
    if (frame.current === null) frame.current = requestAnimationFrame(() => { frame.current = null; if (gesture.current) paint(gesture.current.rect); });
  };
  const finish = () => {
    if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
    if (gesture.current) dispatch({ type: "geometry", id: win.id, rect: gesture.current.rect });
    gesture.current = null;
    element.current?.classList.remove("moving");
  };
  const keyMove = (event: KeyboardEvent<HTMLElement>) => {
    if (!event.altKey || mobile || win.maximized || !event.key.startsWith("Arrow") || event.target !== event.currentTarget) return;
    event.preventDefault();
    const dx = event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0;
    const dy = event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0;
    dispatch({ type: "geometry", id: win.id, rect: gestureRect(win, dx, dy, event.shiftKey ? "se" : "move", bounds) });
  };
  const rect = win.maximized ? { x: 0, y: 0, width: bounds.width, height: bounds.height } : win;
  return <section ref={element} data-window={win.id} aria-label={titles[win.id]} className={`work-window ${active ? "focused" : ""} ${win.maximized ? "maximized" : ""}`} style={mobile ? undefined : { left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: win.z + 1 }} onPointerDownCapture={() => dispatch({ type: "focus", id: win.id })} onFocusCapture={() => { if (!active) dispatch({ type: "focus", id: win.id }); }}>
    <header className="window-title" tabIndex={0} aria-label={`${titles[win.id]} title bar. Alt arrows move; Alt Shift arrows resize.`} onPointerDown={e => begin(e, "move")} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} onKeyDown={keyMove} onDoubleClick={e => { if (!mobile && !(e.target as HTMLElement).closest("button")) dispatch({ type: "maximize", id: win.id }); }}>
      <span className="window-grip"><Move size={12} /></span><h2>{titles[win.id]}</h2><span className="window-index">{String(win.z + 1).padStart(2, "0")}</span>
      <div className="window-buttons"><button title="Minimize" aria-label={`Minimize ${titles[win.id]}`} onClick={() => dispatch({ type: "minimize", id: win.id })}><Minus size={14} /></button>{!mobile && <button title={win.maximized ? "Restore" : "Maximize"} aria-label={`${win.maximized ? "Restore" : "Maximize"} ${titles[win.id]}`} onClick={() => dispatch({ type: "maximize", id: win.id })}>{win.maximized ? <PanelTop size={13} /> : <Maximize2 size={13} />}</button>}<button title="Hide" aria-label={`Close ${titles[win.id]}`} onClick={() => dispatch({ type: "close", id: win.id })}><X size={14} /></button></div>
    </header>
    <div className="window-content">{children}</div>
    {!mobile && !win.maximized && ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map(handle => <div key={handle} aria-hidden="true" className={`resize-handle resize-${handle}`} onPointerDown={e => begin(e, handle)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} />)}
  </section>;
});
