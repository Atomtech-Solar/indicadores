export function parsePositiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" && Number.isFinite(raw) ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
