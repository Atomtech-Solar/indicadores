export function errorMessageFromUnknown(err: unknown): string {
  if (err instanceof Error) return err.message || "Erro desconhecido.";
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
