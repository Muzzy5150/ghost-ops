// Real official client against a MOCK loopback HTTP service, not ClickHouse verification.
import {createServer} from "node:http";
import {expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {clickHouseOperation,telemetryProjection} from "../src/server/sponsor-adapters";
it("official ClickHouse client sends CREATE/JSONEachRow/query over actual bounded local HTTP",async()=>{
  const captured:{body:string;url:string}[]=[];
  const server=createServer((request,response)=>{let body="";request.setEncoding("utf8");request.on("data",part=>{body+=part;});request.on("end",()=>{captured.push({body,url:request.url??""});response.setHeader("content-type","application/json");response.end(body.startsWith("SELECT")?JSON.stringify({engine:"Gateway",event_type:"MOCK_WIRE_TEST",outcome:"observation",runtime_origin:"local-runtime",tool:null,agent_id:null,events:"1",minute:"2026-10-09 00:00:00"})+"\n":"");});});
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  try{const row=telemetryProjection("wire-fixture",{id:randomUUID(),ordinal:1,createdAt:new Date(),actorId:"unverified-fixture",sessionId:null,requestId:null,identityVerified:false,module:"Gateway",kind:"MOCK_WIRE_TEST",simulated:false,incidentId:null});const result=await clickHouseOperation(`http://127.0.0.1:${(server.address() as {port:number}).port}`,"fixture-user","not-a-real-password","wire-fixture",[row]);expect(result).toHaveLength(1);expect(captured).toHaveLength(3);expect(captured[0].body).toContain("ReplacingMergeTree");expect(JSON.parse(captured[1].body.trim()).source_key).toBe(row.source_key);expect(captured[2].body).toContain("FINAL WHERE startsWith");expect(new URL(captured[2].url,"http://127.0.0.1").searchParams.get("param_prefix")).toBe("wire-fixture:");}
  finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
