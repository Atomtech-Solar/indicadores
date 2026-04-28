import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { RequireAuth } from "@/components/auth/RequireAuth";

export const Route = createFileRoute("/pos-cadastro")({
  head: () => ({
    meta: [{ title: "Sua primeira indicação — Atom Tech" }],
  }),
  component: PosCadastroRouteComponent,
});

function PosCadastroRouteComponent() {
  return (
    <RequireAuth>
      <PosCadastro />
    </RequireAuth>
  );
}

function PosCadastro() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ nome: "", whatsapp: "", tipo: "Pessoa" as IndicacaoTipo });
  const [profileForm, setProfileForm] = useState({ nome: "", whatsapp: "" });
  const [contaEnergiaFile, setContaEnergiaFile] = useState<File | null>(null);
  const [contaEnergiaError, setContaEnergiaError] = useState<string | null>(null);
  const [fotoPadraoFile, setFotoPadraoFile] = useState<File | null>(null);
  const [fotoPadraoError, setFotoPadraoError] = useState<string | null>(null);

  const makeUploadId = () => {
    const c = globalThis.crypto as Crypto | undefined;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

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

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser?.id) throw new Error("Não foi possível validar sua sessão para upload.");

      let contaEnergiaPath: string | null = null;
      if (contaEnergiaFile) {
        if (!contaEnergiaFile.type.startsWith("image/")) throw new Error("Envie apenas imagem na conta de energia.");
        if (contaEnergiaFile.size > 5 * 1024 * 1024) throw new Error("Conta de energia: limite máximo de 5MB.");

        const extension = contaEnergiaFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const filePath = `${authUser.id}/${Date.now()}-${makeUploadId()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("indicacoes-comprovantes").upload(filePath, contaEnergiaFile, {
          upsert: false,
          contentType: contaEnergiaFile.type,
        });
        if (uploadError) throw new Error(`Upload da conta de energia falhou: ${uploadError.message}`);
        contaEnergiaPath = filePath;
      }

      let fotoPadraoPath: string | null = null;
      if (fotoPadraoFile) {
        if (!fotoPadraoFile.type.startsWith("image/")) throw new Error("Envie apenas imagem na foto do padrão.");
        if (fotoPadraoFile.size > 5 * 1024 * 1024) throw new Error("Foto do padrão: limite máximo de 5MB.");

        const extension = fotoPadraoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const filePath = `${authUser.id}/${Date.now()}-${makeUploadId()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("indicacoes-comprovantes").upload(filePath, fotoPadraoFile, {
          upsert: false,
          contentType: fotoPadraoFile.type,
        });
        if (uploadError) throw new Error(`Upload da foto do padrão falhou: ${uploadError.message}`);
        fotoPadraoPath = filePath;
      }

      const { data, error } = await supabase
        .from("indicacoes")
        .insert({
          usuario_id: uid,
          nome_indicado: form.nome.trim(),
          whatsapp: form.whatsapp.trim(),
          tipo: mapTipoToDb(form.tipo),
          conta_energia_url: contaEnergiaPath,
          foto_padrao_url: fotoPadraoPath,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["indicacoes"] });
      void queryClient.invalidateQueries({ queryKey: ["atividades"] });
      navigate({ to: "/indicacao-confirmacao", search: { indicacaoId: id } });
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
            Fazer mais indicações
          </div>
          <h1 className="text-3xl md:text-[34px] font-bold tracking-tight leading-tight">
            Vamos cadastrar uma <span className="text-primary">nova indicação</span> agora
          </h1>
          <p className="text-muted-foreground mt-3">
            Continue para ganhar mais com novas oportunidades. A cada indicação enviada,
            você aumenta seu potencial de comissão.
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

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-800">
                Caso não saiba como tirar a foto, vá na aba de tutorial.
              </p>
            </div>

            <div>
              <Label htmlFor="pos-conta-energia" className="text-sm font-medium">
                Suba a foto da conta de energia
              </Label>
              <Input
                id="pos-conta-energia"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setContaEnergiaError(null);
                  if (!file) return setContaEnergiaFile(null);
                  if (!file.type.startsWith("image/")) {
                    setContaEnergiaFile(null);
                    return setContaEnergiaError("Envie apenas arquivo de imagem.");
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setContaEnergiaFile(null);
                    return setContaEnergiaError("Limite máximo de 5MB.");
                  }
                  setContaEnergiaFile(file);
                }}
                className="mt-1.5 rounded-[10px] h-11 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-emerald-700"
              />
              <p className="mt-1 text-xs text-zinc-500">Formato: qualquer imagem • Limite: 5MB</p>
              {contaEnergiaError && <p className="mt-1 text-xs text-rose-600">{contaEnergiaError}</p>}
            </div>

            <div>
              <Label htmlFor="pos-foto-padrao" className="text-sm font-medium">
                Suba a foto do padrão
              </Label>
              <Input
                id="pos-foto-padrao"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setFotoPadraoError(null);
                  if (!file) return setFotoPadraoFile(null);
                  if (!file.type.startsWith("image/")) {
                    setFotoPadraoFile(null);
                    return setFotoPadraoError("Envie apenas arquivo de imagem.");
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setFotoPadraoFile(null);
                    return setFotoPadraoError("Limite máximo de 5MB.");
                  }
                  setFotoPadraoFile(file);
                }}
                className="mt-1.5 rounded-[10px] h-11 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-emerald-700"
              />
              <p className="mt-1 text-xs text-zinc-500">Formato: qualquer imagem • Limite: 5MB</p>
              {fotoPadraoError && <p className="mt-1 text-xs text-rose-600">{fotoPadraoError}</p>}
            </div>

            <Button
              type="submit"
              disabled={createIndicacao.isPending}
              className="w-full rounded-xl h-12 text-base font-semibold mt-2"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar indicação
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
