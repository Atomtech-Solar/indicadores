import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";
import { mapTipoToDb, type IndicacaoTipo } from "@/lib/indicacao-domain";
import { upsertUsuarioProfile, fetchUsuarioRow } from "@/lib/usuario-profile";

export const Route = createFileRoute("/pos-cadastro")({
  beforeLoad: async ({ location }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: `${location.pathname}${location.searchStr}` },
      });
    }
  },
  head: () => ({
    meta: [{ title: "Sua primeira indicação — IndicaPro" }],
  }),
  component: PosCadastro,
});

function PosCadastro() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ nome: "", whatsapp: "", tipo: "Pessoa" as IndicacaoTipo });
  const [profileForm, setProfileForm] = useState({ nome: "", whatsapp: "" });

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["usuario"],
    queryFn: fetchUsuarioRow,
  });

  const saveProfile = useMutation({
    mutationFn: upsertUsuarioProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["usuario"] });
      toast.success("Perfil salvo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createIndicacao = useMutation({
    mutationFn: async () => {
      const { data: uid, error: rpcErr } = await supabase.rpc("get_my_usuario_id");
      if (rpcErr) throw rpcErr;
      if (uid == null) throw new Error("Perfil não encontrado.");

      const { data, error } = await supabase
        .from("indicacoes")
        .insert({
          usuario_id: uid,
          nome_indicado: form.nome.trim(),
          whatsapp: form.whatsapp.trim(),
          tipo: mapTipoToDb(form.tipo),
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["indicacoes"] });
      void queryClient.invalidateQueries({ queryKey: ["atividades"] });
      navigate({ to: "/confirmacao", search: { indicacaoId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.nome.trim() || !profileForm.whatsapp.trim()) return;
    saveProfile.mutate({ nome: profileForm.nome.trim(), whatsapp: profileForm.whatsapp.trim() });
  };

  const submitIndicacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.whatsapp) return;
    createIndicacao.mutate();
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light text-primary-dark text-xs font-semibold mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Complete seu perfil
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
              Nome e WhatsApp para continuar
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">
              Você entrou por magic link ou ainda não salvamos seus dados.
            </p>
          </div>
          <div className="bg-card rounded-2xl shadow-card border border-border p-7">
            <form onSubmit={submitProfile} className="space-y-5">
              <div>
                <Label htmlFor="p-nome" className="text-sm font-medium">
                  Nome
                </Label>
                <Input
                  id="p-nome"
                  required
                  value={profileForm.nome}
                  onChange={(e) => setProfileForm({ ...profileForm, nome: e.target.value })}
                  className="mt-1.5 rounded-[10px] h-11"
                />
              </div>
              <div>
                <Label htmlFor="p-whats" className="text-sm font-medium">
                  WhatsApp
                </Label>
                <Input
                  id="p-whats"
                  required
                  placeholder="(11) 99999-9999"
                  value={profileForm.whatsapp}
                  onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                  className="mt-1.5 rounded-[10px] h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={saveProfile.isPending}
                className="w-full rounded-xl h-12 text-base font-semibold"
              >
                Salvar e continuar
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light text-primary-dark text-xs font-semibold mb-5">
            <Sparkles className="h-3.5 w-3.5" />
            Conta criada com sucesso
          </div>
          <h1 className="text-3xl md:text-[34px] font-bold tracking-tight leading-tight">
            Vamos fazer sua <span className="text-primary">primeira indicação</span> agora
          </h1>
          <p className="text-muted-foreground mt-3">
            Quanto antes você indicar, antes você ganha. Pode ganhar até{" "}
            <strong className="text-foreground">R$ 1.500</strong>.
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border p-7">
          <form onSubmit={(e) => void submitIndicacao(e)} className="space-y-5">
            <div>
              <Label className="text-sm font-medium">Tipo</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
                {(["Pessoa", "Empresa"] as IndicacaoTipo[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, tipo: t })}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                      form.tipo === t
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="nome" className="text-sm font-medium">
                Nome {form.tipo === "Empresa" ? "da empresa" : "do indicado"}
              </Label>
              <Input
                id="nome"
                required
                placeholder={form.tipo === "Empresa" ? "Ex: Padaria Bom Pão" : "Ex: Maria Silva"}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="mt-1.5 rounded-[10px] h-11"
              />
            </div>

            <div>
              <Label htmlFor="whats" className="text-sm font-medium">
                WhatsApp
              </Label>
              <Input
                id="whats"
                required
                placeholder="(11) 99999-9999"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="mt-1.5 rounded-[10px] h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={createIndicacao.isPending}
              className="w-full rounded-xl h-12 text-base font-semibold mt-2"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar minha primeira indicação
            </Button>
          </form>
        </div>

        <div className="text-center mt-5">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition">
            Pular por enquanto
          </Link>
        </div>
      </div>
    </div>
  );
}
