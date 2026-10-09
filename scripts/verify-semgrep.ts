import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sponsorPreflight,sponsorExecute} from "../src/server/sponsors";
import {db} from "../src/server/db";
try {
  const run=async(target:string)=>{const input={commandId:randomUUID(),action:"scan",target};const p=await sponsorPreflight(input);const r=await sponsorExecute({...input,approvalToken:p.approvalToken});assert.equal(r.status,"succeeded");return r.result as {findings:unknown[];comparison:{noLongerReported:string[]};scannerVersion:string};};
  const vulnerable=await run("vulnerable"),corrected=await run("corrected");assert(vulnerable.findings.length>0);assert.equal(corrected.findings.length,0);assert(corrected.comparison.noLongerReported.length>0);
  console.log(JSON.stringify({scanner:"Semgrep CE",version:vulnerable.scannerVersion,vulnerableFindings:vulnerable.findings.length,correctedFindings:corrected.findings.length,removed:corrected.comparison.noLongerReported.length,provenance:"actual-local-scanner",externalModelCalls:0}));
}finally{await db.$disconnect();}
