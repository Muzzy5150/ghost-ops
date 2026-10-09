// @vitest-environment happy-dom
// DOM interaction checks only, not visual/browser sign-off.
import { afterEach,expect,it,vi } from "vitest";
import { cleanup,render,screen,fireEvent,waitFor } from "@testing-library/react";
import WebSentinel from "../src/components/workspace/web-sentinel";
import { defaultLayout,parsePreferences } from "../src/lib/workspace-model";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const snapshot={model:{provider:"ollama-local",model:"installed-local-model",ready:true},webEnabled:true,github:{target:"unconfigured",enabled:false,configured:false},runs:[],backends:[],monitors:[]};
it("distinguishes pending admission, completed execution and handler failure from policy denial",async()=>{
  const requests=[
    {id:"pending",actorId:"agent",resource:"sentinel/repository",allowed:true,reason:"AUTHORIZED",execution:{completed:false}},
    {id:"done",actorId:"agent",resource:"sentinel/scan",allowed:true,reason:"AUTHORIZED",execution:{completed:true}},
    {id:"failed",actorId:"agent",resource:"sentinel/advisories",allowed:false,reason:"TOOL_HANDLER_FAILED",execution:{completed:false}},
    {id:"denied",actorId:"agent",resource:"memory/runtime-policy",allowed:false,reason:"PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN",execution:null},
  ];
  const run={id:"fixture",status:"partial",configuration:{mode:"offline"},assessment:{status:"PENDING",verifiedSponsors:[],checks:[]},requests,observations:[],memoryIntegrity:[],publication:null};
  vi.stubGlobal("fetch",async()=>new Response(JSON.stringify({...snapshot,runs:[run]})));
  render(<WebSentinel csrf="fixture" navigate={vi.fn()}/>);
  await waitFor(()=>expect(screen.getByText("AUTHORIZED · NO COMPLETION RECEIPT · sentinel/repository")).toBeTruthy());
  expect(screen.getByText("EXECUTED · sentinel/scan")).toBeTruthy();
  expect(screen.getByText("AUTHORIZED · EXECUTION FAILED · sentinel/advisories")).toBeTruthy();
  expect(screen.getByText("DENIED · memory/runtime-policy")).toBeTruthy();
});
it("preserves sixteen-window layouts and parks Web Sentinel",()=>{const bounds={width:1440,height:900},layout=defaultLayout(bounds),old={...layout,windows:layout.windows.filter(w=>w.id!=="sentinel")};const restored=parsePreferences(JSON.stringify(old),bounds);expect(restored.windows).toHaveLength(17);expect(restored.windows.find(w=>w.id==="sentinel")?.open).toBe(false);expect(restored.windows.find(w=>w.id==="network")).toEqual(old.windows.find(w=>w.id==="network"));});
it("opening the panel only reads status, without inference or external writes",async()=>{const fetcher=vi.fn(async()=>new Response(JSON.stringify(snapshot)));vi.stubGlobal("fetch",fetcher);render(<WebSentinel csrf="fixture" navigate={vi.fn()}/>);await waitFor(()=>expect(screen.getByText(/installed-local-model/)).toBeTruthy());expect(fetcher.mock.calls).toHaveLength(1);});
it("requires inspected approval and invalidates it when objective changes",async()=>{const fetcher=vi.fn(async(_url:string,options?:RequestInit)=>new Response(JSON.stringify(options?.method==="POST"?{canExecute:true,approvalToken:"synthetic",configuration:JSON.parse(options.body as string)}:snapshot)));vi.stubGlobal("fetch",fetcher);render(<WebSentinel csrf="fixture" navigate={vi.fn()}/>);await waitFor(()=>expect(screen.getByText(/installed-local-model/)).toBeTruthy());expect(screen.queryByRole("button",{name:"Approve and start this bounded run"})).toBeNull();fireEvent.click(screen.getByRole("button",{name:"Inspect exact run"}));await waitFor(()=>expect(screen.getByRole("button",{name:"Approve and start this bounded run"})).toBeTruthy());expect(fetcher.mock.calls.filter(c=>c[1]?.method==="POST")).toHaveLength(1);fireEvent.change(screen.getByLabelText("Sentinel objective"),{target:{value:"Changed objective"}});expect(screen.queryByRole("button",{name:"Approve and start this bounded run"})).toBeNull();});
it("does not expose disabled external-service choices as verified sponsors",async()=>{vi.stubGlobal("fetch",async()=>new Response(JSON.stringify({...snapshot,backends:[{sponsor:"ClickHouse",enabled:false,configured:false}]})));render(<WebSentinel csrf="fixture" navigate={vi.fn()}/>);await waitFor(()=>expect(screen.getByLabelText(/ClickHouse/)).toBeTruthy());expect((screen.getByLabelText(/ClickHouse/) as HTMLInputElement).disabled).toBe(true);expect(screen.getByText(/three-sponsor completion require actual verified receipts/)).toBeTruthy();});
it("a late preflight cannot restore approval after the operator edits the form",async()=>{let finish:(r:Response)=>void=()=>{};vi.stubGlobal("fetch",async(_url:string,options?:RequestInit)=>options?.method==="POST"?new Promise<Response>(resolve=>{finish=resolve;}):new Response(JSON.stringify(snapshot)));render(<WebSentinel csrf="fixture" navigate={vi.fn()}/>);await waitFor(()=>expect(screen.getByText(/installed-local-model/)).toBeTruthy());fireEvent.click(screen.getByRole("button",{name:"Inspect exact run"}));fireEvent.change(screen.getByLabelText("Sentinel objective"),{target:{value:"Changed while request pending"}});finish(new Response(JSON.stringify({canExecute:true,approvalToken:"stale"})));await waitFor(()=>expect((screen.getByRole("button",{name:"Inspect exact run"}) as HTMLButtonElement).disabled).toBe(false));expect(screen.queryByRole("button",{name:"Approve and start this bounded run"})).toBeNull();});
