import type { Tables } from "@/lib/supabase/database.types";

export type IndicacaoRow = Tables<"indicacoes">;

/** Status persistido no banco (PRD) */
export type DbIndicacaoStatus = "enviado" | "analise" | "negociacao" | "fechado" | "perdido";

/** Labels usados na UI atual */
export type UiIndicacaoStatus = "Enviado" | "Em análise" | "Em negociação" | "Fechado" | "Perdido";

export type IndicacaoTipo = "Pessoa" | "Empresa";

export function mapTipoToDb(t: IndicacaoTipo): "pessoa" | "empresa" {
  return t === "Empresa" ? "empresa" : "pessoa";
}

export function mapTipoDbToUi(t: string): IndicacaoTipo {
  return t === "empresa" ? "Empresa" : "Pessoa";
}

export function dbStatusToUi(status: string): UiIndicacaoStatus {
  const s = status as DbIndicacaoStatus;
  switch (s) {
    case "enviado":
      return "Enviado";
    case "analise":
      return "Em análise";
    case "negociacao":
      return "Em negociação";
    case "fechado":
      return "Fechado";
    case "perdido":
      return "Perdido";
    default:
      return "Em análise";
  }
}

export function uiStatusMatchesDb(ui: UiIndicacaoStatus, db: string): boolean {
  return dbStatusToUi(db) === ui;
}
