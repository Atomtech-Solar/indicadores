import { create } from "zustand";

export type IndicacaoStatus = "Em análise" | "Em negociação" | "Fechado" | "Perdido";
export type IndicacaoTipo = "Pessoa" | "Empresa";

export interface Indicacao {
  id: string;
  nome: string;
  whatsapp: string;
  tipo: IndicacaoTipo;
  status: IndicacaoStatus;
  valorPotencial: number;
  data: string; // ISO
}

export interface Ganho {
  id: string;
  nomeIndicado: string;
  valor: number;
  data: string;
}

export interface Usuario {
  nome: string;
  whatsapp: string;
}

interface AppState {
  usuario: Usuario | null;
  indicacoes: Indicacao[];
  ganhos: Ganho[];
  setUsuario: (u: Usuario) => void;
  addIndicacao: (i: Omit<Indicacao, "id" | "status" | "valorPotencial" | "data">) => Indicacao;
  logout: () => void;
}

const seedIndicacoes: Indicacao[] = [
  { id: "i1", nome: "Mariana Silva", whatsapp: "(11) 98123-4567", tipo: "Pessoa", status: "Fechado", valorPotencial: 750, data: "2025-04-18" },
  { id: "i2", nome: "Padaria Bom Pão Ltda", whatsapp: "(11) 3456-7890", tipo: "Empresa", status: "Em negociação", valorPotencial: 1500, data: "2025-04-20" },
  { id: "i3", nome: "Carlos Eduardo Souza", whatsapp: "(21) 99876-5432", tipo: "Pessoa", status: "Em análise", valorPotencial: 500, data: "2025-04-22" },
  { id: "i4", nome: "Studio Ana Beatriz", whatsapp: "(31) 98765-1122", tipo: "Empresa", status: "Fechado", valorPotencial: 1200, data: "2025-04-15" },
  { id: "i5", nome: "Rafael Oliveira", whatsapp: "(11) 98000-1122", tipo: "Pessoa", status: "Em análise", valorPotencial: 750, data: "2025-04-23" },
  { id: "i6", nome: "Mercado Vila Nova", whatsapp: "(11) 4002-8922", tipo: "Empresa", status: "Em negociação", valorPotencial: 2000, data: "2025-04-21" },
  { id: "i7", nome: "Juliana Pereira", whatsapp: "(48) 99111-2233", tipo: "Pessoa", status: "Fechado", valorPotencial: 750, data: "2025-04-10" },
  { id: "i8", nome: "Lucas Almeida", whatsapp: "(85) 98777-3344", tipo: "Pessoa", status: "Perdido", valorPotencial: 500, data: "2025-04-08" },
];

const seedGanhos: Ganho[] = [
  { id: "g1", nomeIndicado: "Mariana Silva", valor: 750, data: "2025-04-19" },
  { id: "g2", nomeIndicado: "Studio Ana Beatriz", valor: 1200, data: "2025-04-16" },
  { id: "g3", nomeIndicado: "Juliana Pereira", valor: 750, data: "2025-04-11" },
  { id: "g4", nomeIndicado: "Empresa Tech Solutions", valor: 500, data: "2025-04-05" },
  { id: "g5", nomeIndicado: "Bruno Martins", valor: 750, data: "2025-04-02" },
];

export const useAppStore = create<AppState>((set) => ({
  usuario: null,
  indicacoes: seedIndicacoes,
  ganhos: seedGanhos,
  setUsuario: (u) => set({ usuario: u }),
  addIndicacao: (data) => {
    const nova: Indicacao = {
      id: `i${Date.now()}`,
      ...data,
      status: "Em análise",
      valorPotencial: data.tipo === "Empresa" ? 1500 : 750,
      data: new Date().toISOString().slice(0, 10),
    };
    set((s) => ({ indicacoes: [nova, ...s.indicacoes] }));
    return nova;
  },
  logout: () => set({ usuario: null }),
}));

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};
