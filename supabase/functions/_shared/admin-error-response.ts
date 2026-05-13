import { errorMessageFromUnknown } from "./errors.ts";
import { jsonResponse } from "./http.ts";

export function adminOpsErrorResponse(req: Request, err: unknown): Response {
  const message = errorMessageFromUnknown(err);
  console.error(JSON.stringify({ type: "admin_ops_error", message, createdAt: new Date().toISOString() }));
  if (message === "FORBIDDEN" || message.includes("FORBIDDEN")) {
    return jsonResponse(req, 403, { error: "Sem permissão para esta operação." });
  }
  if (message === "NOT_FOUND" || message.includes("NOT_FOUND")) {
    return jsonResponse(req, 404, { error: "Indicação não encontrada." });
  }
  const safe =
    message.length > 0 && message.length < 280
      ? message
      : "Não foi possível concluir a solicitação.";
  return jsonResponse(req, 400, { error: safe });
}
