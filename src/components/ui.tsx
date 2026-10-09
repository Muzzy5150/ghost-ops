import { ArrowUpRight, Ghost, ChevronRight, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function Badge({ value, children }: { value: string; children?: ReactNode }) { return <span className={`badge badge-${value.toLowerCase().replaceAll(" ", "-")}`}>{children ?? value}</span>; }
export function Panel({ title, eyebrow, children, action, className = "" }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>{children}</section>;
}
export function Empty({ title = "No activity yet", detail = "Run a simulation to generate real observations and evidence." }: { title?: string; detail?: string }) { return <div className="empty"><Inbox size={27} /><strong>{title}</strong><p>{detail}</p></div>; }
export function GhostMark({ size = 26 }: { size?: number }) { return <span className="ghost-mark"><Ghost size={size} strokeWidth={1.5} /></span>; }
export function SectionLink({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button className="text-button" onClick={onClick}>{children}<ArrowUpRight size={14} /></button>; }
export function time(value: Date | string) { return new Date(value).toISOString().replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC"); }
export function shortId(id: string) { return id.slice(0, 8); }
export function DetailRow({ label, children }: { label: string; children: ReactNode }) { return <div className="detail-row"><span>{label}</span><div>{children}</div></div>; }
export function Chevron() { return <ChevronRight size={14} />; }
