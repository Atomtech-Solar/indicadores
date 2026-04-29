/** Rotas do painel do indicador (admin não pode acessar). */
const INDICADOR_PATH_PREFIXES = [
  "/dashboard",
  "/perfil",
  "/pos-cadastro",
  "/indicacoes",
  "/indicacao-confirmacao",
  "/onboarding",
] as const;

function pathWithoutQuery(path: string): string {
  const i = path.indexOf("?");
  return i === -1 ? path : path.slice(0, i);
}

function matchesBase(path: string, base: string): boolean {
  const p = pathWithoutQuery(path);
  return p === base || p.startsWith(`${base}/`);
}

export function isAdminPath(path: string): boolean {
  return matchesBase(path, "/admin");
}

export function isIndicadorAppPath(path: string): boolean {
  return INDICADOR_PATH_PREFIXES.some((base) => matchesBase(path, base));
}

/** Destino pós-login respeitando segregação admin vs indicador. */
export function resolvePostLoginDestination(input: {
  isAdmin: boolean;
  redirect?: string;
}): string {
  const raw = input.redirect?.trim();
  const safe =
    raw && raw.startsWith("/") && !raw.startsWith("//") && !matchesBase(raw, "/login") ? raw : undefined;

  if (input.isAdmin) {
    if (safe && isAdminPath(safe)) return safe;
    return "/admin";
  }

  if (safe && !isAdminPath(safe)) return safe;
  return "/dashboard";
}
