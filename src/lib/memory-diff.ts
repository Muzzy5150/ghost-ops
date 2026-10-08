export type DiffLine = { text: string; kind: "unchanged" | "removed" | "added" };
// Bounded longest-common-subsequence comparison preserves repeated lines and ordering.
// This describes text changes; it never assigns security severity or integrity.
export function memoryDiff(before: string, after: string): DiffLine[] {
  const split = (s: string) => s.length ? s.split(/\n|(?<=[.!?])\s+(?=[A-Z])/).slice(0, 160) : [];
  const a = split(before), b = split(after);
  const lengths = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) lengths[i][j] = a[i] === b[j] ? 1 + lengths[i + 1][j + 1] : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const result: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { result.push({ text: a[i++], kind: "unchanged" }); j++; }
    else if (i < a.length && (j === b.length || lengths[i + 1][j] >= lengths[i][j + 1])) result.push({ text: a[i++], kind: "removed" });
    else result.push({ text: b[j++], kind: "added" });
  }
  return result;
}
