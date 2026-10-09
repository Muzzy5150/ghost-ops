import { z } from "zod";
import { canonical } from "@/lib/canonical";
import { credentialDigest } from "./config";
import { hash } from "./memory";
import { webJson } from "./web-intelligence";
export function githubConfiguration(env:Record<string,string|undefined>=process.env) {
  const owner=env.GHOSTOPS_GITHUB_OWNER??"",repo=env.GHOSTOPS_GITHUB_REPO??"";
  const configured=/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(owner)&&/^[a-zA-Z0-9_.-]{1,100}$/.test(repo)&&!['.','..'].includes(repo)&&!!env.GHOSTOPS_GITHUB_TOKEN&&env.GHOSTOPS_GITHUB_SCOPE==="security-report";
  return {enabled:env.GHOSTOPS_GITHUB_PUBLISH_ENABLED==="1",configured,target:configured?`${owner}/${repo}`:"unconfigured",binding:credentialDigest(canonical({owner,repo,token:env.GHOSTOPS_GITHUB_TOKEN??"",scope:env.GHOSTOPS_GITHUB_SCOPE??"",enabled:env.GHOSTOPS_GITHUB_PUBLISH_ENABLED??""}))};
}
const issueSchema=z.object({id:z.number().int().positive(),number:z.number().int().positive(),html_url:z.string().url(),title:z.string(),body:z.string().nullable(),created_at:z.string()});
/** Fixed configured target only. No caller URL/repository, retries, comments, PRs or administration. */
export async function publishGithub(report:{runId:string;title:string;body:string;digest:string},signal:AbortSignal,fetcher:typeof fetch=fetch,beforeWrite:()=>Promise<void>=async()=>{}) {
  const config=githubConfiguration();if(!config.enabled||!config.configured||hash(canonical({title:report.title,body:report.body}))!==report.digest)throw new Error("Publication configuration/content unavailable");
  const base=`https://api.github.com/repos/${config.target}`;
  const headers={accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",authorization:`Bearer ${process.env.GHOSTOPS_GITHUB_TOKEN}`,"user-agent":"GhostOps-WebSentinel/1.0"};
  const marker=`<!-- ghostops:${report.runId}:${report.digest} -->`,body=`${report.body}\n\n${marker}`;
  const listed=await webJson(`${base}/issues?state=all&per_page=100`,{headers},512000,fetcher,signal);
  const existing=z.array(issueSchema).max(100).parse(listed.data).find(i=>i.body?.includes(marker));
  signal.throwIfAborted();
  if(!existing){await beforeWrite();signal.throwIfAborted();if(githubConfiguration().binding!==config.binding)throw new Error("Publication configuration changed before dispatch");}
  const created=existing?{data:existing,status:200}:await webJson(`${base}/issues`,{method:"POST",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({title:report.title,body})},128000,fetcher,signal);
  const issue=issueSchema.parse(created.data);const expectedUrl=`https://github.com/${config.target}/issues/${issue.number}`;
  if(issue.html_url!==expectedUrl||issue.title!==report.title||issue.body!==body)throw new Error("Publication response mismatch; uncertain effect, no retry");
  const read=await webJson(`${base}/issues/${issue.number}`,{headers},128000,fetcher,signal),verified=issueSchema.parse(read.data);
  if(verified.id!==issue.id||verified.html_url!==expectedUrl||verified.title!==report.title||verified.body!==body)throw new Error("External read-back mismatch; uncertain effect, no retry");
  return {target:config.target,operation:"create-issue",contentDigest:report.digest,artifactId:issue.id,artifactNumber:issue.number,url:issue.html_url,createdAt:issue.created_at,creationStatus:created.status,readBackStatus:read.status,verified:true,execution:fetcher===fetch&&process.env.NODE_ENV!=="test"?"actual-github":"mock-github",existing:!!existing};
}
