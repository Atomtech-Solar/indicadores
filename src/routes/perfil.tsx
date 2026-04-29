import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Users, Wallet, Pencil, CreditCard, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchUsuarioRow, upsertUsuarioProfile } from "@/lib/usuario-profile";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/auth-context";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [{ title: "Perfil — ATOM TECH" }],
  }),
  component: PerfilRoute,
});

function PerfilRoute() {
  return (
    <RequireAuth>
      <PerfilPage />
    </RequireAuth>
  );
}

function PerfilPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ nome: "", whatsapp: "" });
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [fotoPerfilPath, setFotoPerfilPath] = useState<string | null>(null);
  const [fotoPerfilSignedUrl, setFotoPerfilSignedUrl] = useState<string | null>(null);
  const [fotoPerfilFile, setFotoPerfilFile] = useState<File | null>(null);
  const [fotoPerfilError, setFotoPerfilError] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["usuario"],
    queryFn: fetchUsuarioRow,
  });

  useEffect(() => {
    setForm({
      nome: profile?.nome ?? "",
      whatsapp: profile?.whatsapp ?? "",
    });
    setFotoPerfilPath(profile?.foto_perfil_url ?? null);
    setFotoPerfilFile(null);
    setFotoPerfilError(null);
  }, [profile?.nome, profile?.whatsapp, profile?.foto_perfil_url]);

  useEffect(() => {
    const run = async () => {
      if (!fotoPerfilPath) {
        setFotoPerfilSignedUrl(null);
        return;
      }
      const { data } = await supabase.storage.from("perfil-fotos").createSignedUrl(fotoPerfilPath, 60 * 60);
      setFotoPerfilSignedUrl(data?.signedUrl ?? null);
    };
    void run();
  }, [fotoPerfilPath]);

  const initials = useMemo(() => {
    const source = form.nome || user?.email || "U";
    return source.slice(0, 1).toUpperCase();
  }, [form.nome, user?.email]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nome = form.nome.trim();
      const whatsapp = form.whatsapp.trim();

      if (!nome || !whatsapp) {
        throw new Error("Preencha nome e WhatsApp.");
      }

      let nextFotoPerfilPath = fotoPerfilPath;
      if (fotoPerfilFile) {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !authUser?.id) {
          throw new Error("Não foi possível validar sua sessão para upload.");
        }

        if (!fotoPerfilFile.type.startsWith("image/")) {
          throw new Error("Envie apenas arquivo de imagem.");
        }
        if (fotoPerfilFile.size > 5 * 1024 * 1024) {
          throw new Error("A foto de perfil deve ter no máximo 5MB.");
        }

        const extension = fotoPerfilFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const filePath = `${authUser.id}/${Date.now()}-perfil.${extension}`;
        const { error: uploadError } = await supabase.storage.from("perfil-fotos").upload(filePath, fotoPerfilFile, {
          upsert: false,
          contentType: fotoPerfilFile.type,
        });
        if (uploadError) throw new Error(`Upload da foto falhou: ${uploadError.message}`);
        nextFotoPerfilPath = filePath;
      }

      await upsertUsuarioProfile({ nome, whatsapp, fotoPerfilUrl: nextFotoPerfilPath });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["usuario"] });
      toast.success("Perfil atualizado com sucesso.");
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível atualizar o perfil.");
    },
  });

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden min-[1101px]:flex w-64 shrink-0 flex-col bg-[#024b2e] border-r border-[#04653f] sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-[#04653f]">
          <Link to="/" className="flex items-center justify-center">
            <img src="/img/Ativo 3.png" alt="ATOM TECH" className="h-16 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          <Link
            to="/dashboard"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:bg-[#0b6a42] hover:text-white transition"
          >
            <LayoutDashboard className="h-[18px] w-[18px]" />
            Visão geral
          </Link>
          <Link
            to="/dashboard"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:bg-[#0b6a42] hover:text-white transition"
          >
            <Users className="h-[18px] w-[18px]" />
            Indicações
          </Link>
          <Link
            to="/dashboard"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:bg-[#0b6a42] hover:text-white transition"
          >
            <Wallet className="h-[18px] w-[18px]" />
            Comissões
          </Link>
          <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#23a548] text-white">
            <Pencil className="h-[18px] w-[18px]" />
            Perfil
          </div>
        </nav>
      </aside>

      <div
        className={`min-[1101px]:hidden fixed inset-0 z-40 transition-all duration-300 ${
          showSidebarMenu ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Fechar menu lateral"
          className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
            showSidebarMenu ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setShowSidebarMenu(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[84vw] max-w-xs bg-[#024b2e] border-r border-[#04653f] shadow-2xl transition-transform duration-300 ${
            showSidebarMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-16 px-4 border-b border-[#04653f] flex items-center justify-between">
            <img src="/img/Ativo 3.png" alt="ATOM TECH" className="h-10 w-auto object-contain" />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 text-white"
              onClick={() => setShowSidebarMenu(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-3 py-5 space-y-1">
            <Link
              to="/dashboard"
              onClick={() => setShowSidebarMenu(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:bg-[#0b6a42] hover:text-white transition"
            >
              <LayoutDashboard className="h-[18px] w-[18px]" />
              Visão geral
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setShowSidebarMenu(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:bg-[#0b6a42] hover:text-white transition"
            >
              <Users className="h-[18px] w-[18px]" />
              Indicações
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setShowSidebarMenu(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:bg-[#0b6a42] hover:text-white transition"
            >
              <Wallet className="h-[18px] w-[18px]" />
              Comissões
            </Link>
            <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#23a548] text-white">
              <Pencil className="h-[18px] w-[18px]" />
              Perfil
            </div>
          </nav>
          <div className="p-4 border-t border-[#04653f]">
            <a
              href="https://wa.me/556139781738"
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center rounded-lg border border-white/25 px-3 py-2 text-sm font-medium text-white/95 hover:bg-[#0b6a42] hover:text-white transition"
            >
              Falar com o suporte
            </a>
          </div>
        </aside>
      </div>

      <main className="flex-1 min-w-0 bg-white">
        <header className="bg-card border-b border-border px-6 lg:px-10 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="min-[1101px]:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-muted"
              onClick={() => setShowSidebarMenu(true)}
              aria-label="Abrir menu lateral"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">Perfil</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas informações pessoais</p>
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-10 py-8 max-w-[1100px] mx-auto space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6 md:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {fotoPerfilSignedUrl ? (
                  <img src={fotoPerfilSignedUrl} alt="Foto de perfil" className="h-16 w-16 rounded-full object-cover border border-zinc-200" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 text-2xl font-bold grid place-items-center">
                    {initials}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">{form.nome || "Seu perfil"}</h2>
                  <p className="text-sm text-zinc-600">{user?.email || "Sem e-mail"}</p>
                </div>
              </div>

              {!isEditing ? (
                <Button type="button" onClick={() => setIsEditing(true)} className="rounded-xl">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar perfil
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setForm({ nome: profile?.nome ?? "", whatsapp: profile?.whatsapp ?? "" });
                      setFotoPerfilPath(profile?.foto_perfil_url ?? null);
                      setFotoPerfilFile(null);
                      setFotoPerfilError(null);
                    }}
                    className="rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || isLoading}
                    className="rounded-xl"
                  >
                    {saveMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
              <div>
                <Label htmlFor="perfil-nome">Nome</Label>
                <Input
                  id="perfil-nome"
                  value={form.nome}
                  onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                  disabled={!isEditing || saveMutation.isPending || isLoading}
                  className="mt-1.5 rounded-[10px] h-11"
                />
              </div>

              <div>
                <Label htmlFor="perfil-whatsapp">WhatsApp</Label>
                <Input
                  id="perfil-whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  disabled={!isEditing || saveMutation.isPending || isLoading}
                  className="mt-1.5 rounded-[10px] h-11"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="perfil-email">E-mail</Label>
                <Input
                  id="perfil-email"
                  value={user?.email ?? ""}
                  readOnly
                  disabled
                  className="mt-1.5 rounded-[10px] h-11"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="perfil-foto">Foto de perfil</Label>
                <Input
                  id="perfil-foto"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setFotoPerfilError(null);
                    if (!file) {
                      setFotoPerfilFile(null);
                      return;
                    }
                    if (!file.type.startsWith("image/")) {
                      setFotoPerfilFile(null);
                      setFotoPerfilError("Envie apenas arquivo de imagem.");
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      setFotoPerfilFile(null);
                      setFotoPerfilError("Limite máximo de 5MB.");
                      return;
                    }
                    setFotoPerfilFile(file);
                  }}
                  disabled={!isEditing || saveMutation.isPending || isLoading}
                  className="mt-1.5 rounded-[10px] h-11 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-emerald-700"
                />
                <p className="mt-1 text-xs text-zinc-500">Formato: imagem • Limite: 5MB</p>
                {fotoPerfilError && <p className="mt-1 text-xs text-rose-600">{fotoPerfilError}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6 md:p-7">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 grid place-items-center text-emerald-700 shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Pagamentos</h3>
                <p className="text-sm text-zinc-600 mt-1">
                  Em breve você poderá configurar seus dados para saque.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
