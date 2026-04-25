import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta — IndicaPro" },
      { name: "description", content: "Crie sua conta grátis em menos de 1 minuto." },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const navigate = useNavigate();
  const setUsuario = useAppStore((s) => s.setUsuario);
  const [form, setForm] = useState({ nome: "", whatsapp: "", senha: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.whatsapp) return;
    setUsuario({ nome: form.nome, whatsapp: form.whatsapp });
    navigate({ to: "/pos-cadastro" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <header className="px-6 py-5">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </header>

      <div className="flex-1 grid place-items-center px-6 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow mb-4">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Criar sua conta</h1>
            <p className="text-sm text-muted-foreground mt-2">Leva menos de 1 minuto</p>
          </div>

          <div className="bg-card rounded-2xl shadow-card border border-border p-7">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="nome" className="text-sm font-medium">Nome</Label>
                <Input id="nome" required placeholder="Seu nome completo"
                  value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="mt-1.5 rounded-[10px] h-11" />
              </div>
              <div>
                <Label htmlFor="whats" className="text-sm font-medium">WhatsApp</Label>
                <Input id="whats" required placeholder="(11) 99999-9999"
                  value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="mt-1.5 rounded-[10px] h-11" />
              </div>
              <div>
                <Label htmlFor="senha" className="text-sm font-medium">Senha</Label>
                <Input id="senha" type="password" required placeholder="Mínimo 6 caracteres"
                  value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className="mt-1.5 rounded-[10px] h-11" />
              </div>

              <Button type="submit" className="w-full rounded-xl h-12 text-base font-semibold mt-2">
                Criar conta grátis
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="px-3 bg-card text-xs text-muted-foreground">ou</span></div>
              </div>

              <Button type="button" variant="outline" className="w-full rounded-xl h-12 text-base font-medium bg-card">
                <MessageCircle className="h-5 w-5 mr-2 text-primary" />
                Entrar com WhatsApp
              </Button>
            </form>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Ao criar sua conta você concorda com nossos termos.
          </p>
        </div>
      </div>
    </div>
  );
}
