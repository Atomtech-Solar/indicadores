export type ListParams = { page?: number; limit?: number; search?: string };

export function normalizeListParams(input: ListParams) {
  const page = Number.isFinite(input.page) ? Math.max(1, Number(input.page)) : 1;
  const limit = Number.isFinite(input.limit) ? Math.min(500, Math.max(1, Number(input.limit))) : 10;
  const search = (input.search ?? "").trim();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, limit, search, from, to };
}

export function parseBrazilianDateSearch(search: string): { startIso: string; endIso: string } | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(search.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    return null;
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
