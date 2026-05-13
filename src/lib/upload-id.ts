/**
 * Identificador único para paths de upload no Storage.
 * Em contexto não seguro (HTTP), `crypto.randomUUID` pode estar ausente.
 */
export function makeUploadId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}
