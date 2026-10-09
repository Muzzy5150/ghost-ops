import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const read = p => readFileSync(p, 'utf8');
const walk = p => readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
test('hosted entrypoint is statically exported, not the local runtime',()=>{
  assert.match(read('next.config.ts'), /output: 'export'/);
  const sources=walk('app').concat(walk('components'),walk('generated/components'),walk('generated/lib'));
  assert(sources.every(p=>!p.includes('/api/') && !p.endsWith('route.ts') && !p.includes('proxy.')));
  for(const p of sources){ const text=read(p); assert(!/use server|from\s+['"][^'"]*(?:src\/server|prisma|node:child_process)|fetch\(/.test(text),p); }
});
test('public case is an exact minimized projection of recorded synthetic evidence',()=>{
  const record=JSON.parse(read('data/recorded-case.json'));
  const raw=execFileSync('unzip',['-p',`../../${record.source}`,'events.jsonl'],{encoding:'utf8'}).trim().split('\n').map(JSON.parse);
  for(const e of record.events){const original=raw.find(o=>o.id===e.id);assert(original);assert.equal(e.ordinal,original.ordinal);assert.equal(e.kind,original.kind);assert.equal(e.at,original.createdAt);assert.equal(e.handlerExecuted,original.details.handlerExecuted??original.details.executionAllowed??null);assert.equal(e.decision,original.details.decision??original.details.authorization??null);for(const field of ['tool','operation','allowed'])assert.equal(e[field],original.details[field]??null);}
  assert.match(record.label,/scripted/); assert(!/credential|sessionId|contentHash|actorId/.test(JSON.stringify(record)));
});
test('no fake live provider, sponsor success or control-plane actions',()=>{
  assert.match(read('app/page.tsx'),/HostedWorkstation/);
  assert.match(read('components/hosted-panels.tsx'),/live verification pending/);
  assert.match(read('app/console/page.tsx'),/no gateway, database, administrative session/);
  assert.match(read('components/recorded-network.tsx'),/VIEW ONLY/);
  assert(!/setInterval|animated: true|https?:\/\/127\.0\.0\.1/.test(read('components/recorded-network.tsx')));
});
test('deployment headers restrict browser capabilities and destinations',()=>{
  const config=JSON.parse(read('vercel.json'));const headers=config.headers[0].headers;
  assert.equal(headers.find(h=>h.key==='X-Frame-Options').value,'DENY');
  assert.equal(headers.find(h=>h.key==='X-Content-Type-Options').value,'nosniff');
  assert.match(headers.find(h=>h.key==='Content-Security-Policy').value,/connect-src 'self'/);
  assert.match(headers.find(h=>h.key==='Content-Security-Policy').value,/form-action 'none'/);
});
test('built artifact contains public pages but no backend API/functions/private material',()=>{
  assert(existsSync('out/index.html'),'Build first');
  const files=walk('out');
  for(const route of ['demo','about','docs','developers','console']) assert(existsSync(`out/${route}/index.html`));
  assert(!files.some(f=>/\/api\/|\.db(?:-|$)|\.key$|\.env|\.zip$|\.map$/.test(f)));
  const content=files.filter(f=>/\.(?:js|html|txt|json)$/.test(f)).map(read).join('\n');
  assert(!/ghostops-admin|x-ghostops-csrf|GHOSTOPS_SIGNING_SECRET|OPENAI_API_KEY|\.ghostops\/integrity\.key|\/Users\/muzzy5150/.test(content));
  // Developer docs show environment references, never actual credential values.
  assert(!/gh[pousr]_[A-Za-z0-9]{30,}|sk-proj-[A-Za-z0-9_-]{32,}/.test(content));
});
test('shared graph, windows and styles are exported unchanged from the authoritative frontend',()=>{
  for(const path of ['components/workspace/network.tsx','components/workspace/security-node.tsx','components/workspace/window.tsx','components/workspace/workspace.tsx','lib/graph-explorer.ts','lib/workspace-model.ts','lib/workspace-graph.ts']) assert.equal(read(`generated/${path}`),read(`../../src/${path}`),path);
  for(const name of ['globals','workspace','phase5']) assert.equal(read(`generated/styles/${name}.css`),read(`../../src/app/${name}.css`));
  assert(!existsSync('generated/server'));assert(!existsSync('generated/runtime'));
});
test('no hardcoded fabricated recency in source, repository prose or public output',()=>{
  const paths=[...walk('app'),...walk('components'),...walk('data'),...walk('generated'),...walk('../../docs'),'../../README.md',...walk('out')].filter(p=>/\.(?:tsx?|jsx?|mjs|json|html|md|txt)$/.test(p));
  const placeholders=/\b(?:\d+ (?:minutes?|hours?|days?|weeks?) ago|yesterday|last week|updated recently|created \d+ minutes? ago)\b/i;
  for(const path of paths) assert(!placeholders.test(read(path)),path);
});
