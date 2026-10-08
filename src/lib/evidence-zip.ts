// Deliberately narrow ZIP profile: stored entries only, fixed names, no extraction,
// compression, encryption, extra fields, ZIP64, comments or arbitrary paths.
export const evidenceNames = ["manifest.json", "experiment.json", "events.jsonl", "policy-decisions.json", "memory-evidence.json", "incidents.json", "summary.html"] as const;
export const evidenceLimit = 2 * 1024 * 1024;
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; return c >>> 0; });
function crc(data: Uint8Array) { let c = 0xffffffff; for (const byte of data) c = table[(c ^ byte) & 255] ^ c >>> 8; return (c ^ 0xffffffff) >>> 0; }
export function evidenceZip(files: Record<string, string | Buffer>): Buffer {
  const local: Buffer[] = [], central: Buffer[] = []; let offset = 0, total = 0;
  const entries = Object.entries(files).sort(([a], [b]) => a < b ? -1 : 1);
  if (entries.length > evidenceNames.length) throw new Error("Too many evidence files");
  for (const [name, value] of entries) {
    if (!(evidenceNames as readonly string[]).includes(name)) throw new Error("Unsafe archive filename");
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value), filename = Buffer.from(name);
    total += bytes.length; if (total > evidenceLimit || bytes.length > 1024 * 1024) throw new Error("Evidence package exceeds limits");
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0x21, 12); h.writeUInt32LE(crc(bytes), 14); h.writeUInt32LE(bytes.length, 18); h.writeUInt32LE(bytes.length, 22); h.writeUInt16LE(filename.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(0x21, 14); c.writeUInt32LE(crc(bytes), 16); c.writeUInt32LE(bytes.length, 20); c.writeUInt32LE(bytes.length, 24); c.writeUInt16LE(filename.length, 28); c.writeUInt32LE(offset, 42);
    local.push(h, filename, bytes); central.push(c, filename); offset += h.length + filename.length + bytes.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
export function readEvidenceZip(input: Uint8Array): Record<string, Buffer> {
  const b = Buffer.from(input);
  if (b.length < 22 || b.length > evidenceLimit + 8192) throw new Error("Invalid archive size");
  const end = b.length - 22;
  if (b.readUInt32LE(end) !== 0x06054b50 || b.readUInt16LE(end + 4) || b.readUInt16LE(end + 6) || b.readUInt16LE(end + 20)) throw new Error("Unsupported archive profile");
  const count = b.readUInt16LE(end + 10), directory = b.readUInt32LE(end + 16), length = b.readUInt32LE(end + 12);
  if (count < 1 || count > evidenceNames.length || b.readUInt16LE(end + 8) !== count || directory + length !== end) throw new Error("Invalid archive directory");
  const files: Record<string, Buffer> = {}; let cursor = directory, localOffset = 0, total = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || b.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid directory entry");
    const n = b.readUInt16LE(cursor + 28), size = b.readUInt32LE(cursor + 24), offset = b.readUInt32LE(cursor + 42), checksum = b.readUInt32LE(cursor + 16);
    if (cursor + 46 + n > end || b.readUInt16LE(cursor + 8) !== 0x0800 || b.readUInt16LE(cursor + 10) || b.readUInt16LE(cursor + 30) || b.readUInt16LE(cursor + 32) || b.readUInt16LE(cursor + 34) || b.readUInt32LE(cursor + 20) !== size || offset !== localOffset) throw new Error("Unsafe archive entry");
    const filename = b.subarray(cursor + 46, cursor + 46 + n), name = filename.toString("utf8");
    if (!(evidenceNames as readonly string[]).includes(name) || files[name] || size > 1024 * 1024) throw new Error("Unsafe or duplicate filename");
    const start = offset + 30 + n; total += size;
    if (total > evidenceLimit || start + size > directory || offset + 30 > directory || b.readUInt32LE(offset) !== 0x04034b50 || b.readUInt16LE(offset + 6) !== 0x0800 || b.readUInt16LE(offset + 8) || b.readUInt32LE(offset + 14) !== checksum || b.readUInt32LE(offset + 18) !== size || b.readUInt32LE(offset + 22) !== size || b.readUInt16LE(offset + 26) !== n || b.readUInt16LE(offset + 28) || !b.subarray(offset + 30, start).equals(filename)) throw new Error("Archive headers inconsistent");
    const bytes = b.subarray(start, start + size); if (crc(bytes) !== checksum) throw new Error("Archive checksum mismatch");
    files[name] = bytes; localOffset = start + size; cursor += 46 + n;
  }
  if (cursor !== end || localOffset !== directory) throw new Error("Unexpected archive data");
  return files;
}
