// Read-only source/history review. Never print matching credential values.
import { execFileSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
const git = (...args) => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const objects = git('rev-list', '--objects', 'HEAD', 'v1.0.0-rc.1').toString().trim().split('\n');
const findings = []; let blobs = 0; let archiveEntries = 0;
const patterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['provider-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-)?[A-Za-z0-9_-]{32,}|AKIA[A-Z0-9]{16})\b/g],
  ['credential-url', /(?:mongodb(?:\+srv)?|postgres(?:ql)?):\/\/[^\s:@]+:[^\s@]+@/g],
  ['credential-literal', /(?:api[_-]?key|access[_-]?token|signing[_-]?key|password|credential)\s*[=:]\s*["']([^"'\n]{20,})["']/gi],
];
function inspect(bytes, path, oid) {
  const content = bytes.toString('utf8');
  for (const [type, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const value = match[1] ?? match[0];
      if (/process\.env|example|synthetic|placeholder|not-a|test-|dummy|fixture|\$\{|\.repeat\(|env\.|config\.|approved-|^set-securely-in-your-shell-never-commit$/i.test(value)) continue;
      findings.push({ type, path, oid, line: content.slice(0, match.index).split('\n').length, valueLength: value.length });
    }
  }
  if (/\.(?:db|sqlite|sqlite3)(?:-|$)|(?:^|\/)\.env(?:$|\.(?!example))|(?:^|\/)\.ghostops\//.test(path)) findings.push({type:'sensitive-path',path,oid});
}
for (const row of objects) {
  const split = row.indexOf(' '); if (split < 0) continue;
  const oid = row.slice(0, split); const path = row.slice(split + 1);
  if (git('cat-file', '-t', oid).toString().trim() !== 'blob') continue;
  const bytes = git('cat-file', 'blob', oid); blobs++; inspect(bytes, path, oid);
  if (path.endsWith('.zip')) {
    let offset = 0;
    while (offset + 30 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
      const flags = bytes.readUInt16LE(offset + 6), method = bytes.readUInt16LE(offset + 8);
      const size = bytes.readUInt32LE(offset + 18), nameLength = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28);
      const name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString();
      const start = offset + 30 + nameLength + extra;
      if (flags & 8 || ![0,8].includes(method) || size > 8*1024*1024) throw Error(`Unsupported archive entry: ${path}`);
      const payload = bytes.subarray(start, start + size);
      inspect(method === 0 ? payload : inflateRawSync(payload, { maxOutputLength: 8*1024*1024 }), `${path}::${name}`, oid);
      archiveEntries++; offset = start + size;
    }
  }
}
console.log(JSON.stringify({ refs: ['HEAD','v1.0.0-rc.1'], blobs, archiveEntries, findings }, null, 2));
if (findings.length) process.exitCode = 1;
