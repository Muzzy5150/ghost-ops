import {execFileSync} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const directory=mkdtempSync(join(tmpdir(),"ghostops-phase12-clean-"));
const env:NodeJS.ProcessEnv={PATH:process.env.PATH,LANG:"en_US.UTF-8",NODE_ENV:"test",CI:"1",NEXT_TELEMETRY_DISABLED:"1",PRISMA_HIDE_UPDATE_MESSAGE:"1",GHOSTOPS_MODEL_ENABLED:"0",GHOSTOPS_WEB_ENABLED:"0",GHOSTOPS_GITHUB_PUBLISH_ENABLED:"0",GHOSTOPS_SPONSOR_EGRESS:"0",OPENAI_API_KEY:"",...(process.env.GHOSTOPS_SEMGREP_BINARY?{GHOSTOPS_SEMGREP_BINARY:process.env.GHOSTOPS_SEMGREP_BINARY}:{})};
try{
  const archive=execFileSync("git",["archive","HEAD"],{maxBuffer:32*1024*1024});execFileSync("tar",["-x","-C",directory],{input:archive});
  for(const args of [["ci"],["run","setup"],["run","sdk:build"],["run","typecheck"],["run","lint"],["test"],["run","build"],["run","test:external"],...(env.GHOSTOPS_SEMGREP_BINARY?[["run","test:sentinel"]]:[]),["audit","--omit=dev"]]){console.log(`CLEAN CHECKOUT: npm ${args.join(" ")}`);execFileSync("npm",args,{cwd:directory,env:{...env,...(args.includes("build")?{NODE_ENV:"production" as const}:{})},stdio:"inherit",timeout:240000});}
  console.log("PASS committed clean archive install, ten migrations/seed, public package builds and independent tarball installation, typecheck/lint/full suite/production build, cross-process MCP/enforcement/forensics, optional actual scanner Sentinel proof and production audit. No original database/key or provider credentials copied; inference/publication disabled.");
}finally{rmSync(directory,{recursive:true});}
