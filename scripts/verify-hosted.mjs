// HTTP verification only, not browser/visual sign-off. Official CLI manages its own auth.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const [destination, commit, mode = 'protected'] = process.argv.slice(2);
const url = new URL(destination);
assert(url.protocol === 'https:' && url.hostname.endsWith('.vercel.app') && url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash, 'Expected an exact Vercel deployment origin');
assert(/^[a-f0-9]{40}$/.test(commit), 'Expected full reviewed source commit');
assert(['protected', 'public'].includes(mode));
const team = 'team_U4j5MWRYmPkrG42UQqQi4gjv';
const project = 'prj_gmQjSKR9igKAXUFdwMgFsEcZdTBI';
const vc = args => {
  try { return execFileSync('npx', ['--yes', 'vercel@63.1.0', ...args], { encoding: 'utf8', timeout: 90000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { throw Error('Official Vercel CLI request failed; response/authentication output withheld'); }
};
const deployment = JSON.parse(vc(['api', `/v13/deployments/${encodeURIComponent(url.hostname)}?teamId=${team}`]));
assert.equal(deployment.projectId, project, 'Wrong project: do not send authenticated requests');
assert.equal(deployment.meta?.sourceCommit ?? deployment.meta?.githubCommitSha ?? deployment.gitSource?.sha, commit, 'Unreviewed source revision');
assert.equal(deployment.readyState, 'READY');
function request(path, method = 'GET', canonical = false) {
  // Do not follow a protection redirect into a login page or disable protection.
  const options = ['--silent', '--show-error', '--include', '--max-time', '30', ...(method === 'HEAD' ? ['--head'] : ['--request', method])];
  const raw = mode === 'protected'
    ? vc(['curl', path, '--deployment', url.origin, '--scope', 'muzzy5150s-projects', '--yes', '--', ...options])
    : execFileSync('curl', [...options, `${url.origin}${path}`], {encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
  // Discard proxy CONNECT headers; do not print cookies or protection credentials.
  const blocks = raw.split(/\r?\n\r?\n/);
  while (blocks.length > 1 && /^HTTP\/\S+ 200 Connection established/i.test(blocks[0])) blocks.shift();
  const headers = blocks.shift();
  const status = Number(headers.match(/^HTTP\/\S+ (\d+)/)?.[1]);
  if (mode === 'protected' && [302,401,403].includes(status)) throw Error(`Protected request returned ${status}; authorize this project/team through the normal Vercel connection. No protection workaround performed.`);
  // Next static export canonicalizes extensionless paths, including missing APIs.
  // Accept only one same-origin trailing-slash 308; never follow auth redirects.
  if (status === 308 && !canonical && !path.endsWith('/')) {
    const location = headers.match(/^location:\s*(.+)$/im)?.[1].trim();
    assert(location, 'Canonical redirect without Location');
    const target = new URL(location, url.origin);
    assert.equal(target.origin, url.origin, 'Redirect escaped reviewed origin');
    assert.equal(target.pathname, `${path}/`, 'Unexpected canonical destination');
    assert(!target.search && !target.hash, 'Unexpected redirect parameters');
    return request(target.pathname, method, true);
  }
  return {status, headers, body:blocks.join('\n\n')};
}
const results = [];
function verifyPublicContent(body) {
  assert(!/\b(?:\d+ (?:minutes?|hours?|days?|weeks?) ago|yesterday|last week|updated recently)\b/i.test(body), 'Fabricated recency in deployed content');
  assert(!/GHOSTOPS_SIGNING_SECRET|ghostops-admin|\/Users\/muzzy5150|gh[pousr]_[A-Za-z0-9]{30,}|sk-proj-[A-Za-z0-9_-]{32,}/.test(body), 'Private material in deployed content');
}
let html = '';
for (const path of ['/', '/terminal/', '/demo/', '/about/', '/docs/', '/developers/', '/console/']) {
  const r = request(path); assert.equal(r.status, 200, path);
  assert(/x-content-type-options: nosniff/i.test(r.headers), 'Missing nosniff');
  assert(/x-frame-options: DENY/i.test(r.headers), 'Missing frame protection');
  assert(/content-security-policy:.*connect-src 'self'/i.test(r.headers), 'Missing site CSP');
  assert(/GHOST OPS|Ghost Ops/.test(r.body), 'Unexpected page, possibly an authentication interstitial');
  verifyPublicContent(r.body);
  if (path === '/') assert(/YOUR AGENTS/.test(r.body), 'Homepage story missing');
  if (path === '/terminal/') assert(/ops-workbench/.test(r.body), 'Terminal workstation missing');
  assert(!/GHOSTOPS_SIGNING_SECRET|ghostops-admin|\/Users\/muzzy5150/.test(r.body));
  html += r.body; results.push({path,status:r.status});
}
const assets = [...new Set([...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)].map(m=>m[1]))];
assert(assets.length >= 2, 'Missing static application assets');
for (const path of assets) { assert(path.startsWith('/_next/')); const r=request(path);assert.equal(r.status,200,path);verifyPublicContent(r.body); }
for (const path of ['/brand/ghost-icon.svg','/brand/ghostops-mascot.webp','/brand/ghostops-mascot.png']) { const r=request(path,'HEAD');assert.equal(r.status,200,path);assert(/content-type: image\//i.test(r.headers),path);results.push({path,method:'HEAD',status:r.status}); }
for (const path of ['/api/bootstrap','/api/state','/api/control','/api/mcp','/api/ingest','/api/evidence','/.env','/.ghostops/integrity.key','/prisma/dev.db']) {
  const r=request(path);assert([404,405].includes(r.status),`Unexpected exposure ${path}: ${r.status}`);results.push({path,status:r.status});
}
for (const path of ['/api/control','/api/mcp']) {const r=request(path,'POST');assert([404,405].includes(r.status),path);results.push({path,method:'POST',status:r.status});}
console.log(JSON.stringify({verifiedAt:new Date().toISOString(),origin:url.origin,deploymentId:deployment.id,projectId:project,sourceCommit:commit,target:deployment.target??'preview',mode,staticAssetsChecked:assets.length,results,visualInspection:false},null,2));
