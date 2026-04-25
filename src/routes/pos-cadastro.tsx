import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore, type IndicacaoTipo } from "@/lib/store";

export const Route = createFileRoute("/pos-cadastro")({
  head: () => ({
    meta: [{ title: "Sua primeira indicação — IndicaPro" }],
  }),
  component: PosCadastro,
});

function PosCadastro() {
  const navigate = useNavigate();
  const usuario = useAppStore((s) => s.usuario);
  const addIndicacao = useAppStore((s) => s.addIndicacao);
  const [form, setForm] = useState({ nome: "", whatsapp: "", tipo: "Pessoa" as IndicacaoTipo });

  useEffect(() => {
    if (!usuario) navigate({ to: "/cadastro" });
  }, [usuario, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.whatsapp) return;
    addIndicacao(form);
    navigate({ to: "/confirmacao" });
  };

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
            Quanto antes você indicar, antes você ganha. Pode ganhar até <strong className="text-foreground">R$ 1.500</strong>.
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border p-7">
          <form onSubmit={submit} className="space-y-5">
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
              <Input id="nome" required
                placeholder={form.tipo === "Empresa" ? "Ex: Padaria Bom Pão" : "Ex: Maria Silva"}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="mt-1.5 rounded-[10px] h-11" />
            </div>

            <div>
              <Label htmlFor="whats" className="text-sm font-medium">WhatsApp</Label>
              <Input id="whats" required placeholder="(11) 99999-9999"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="mt-1.5 rounded-[10px] h-11" />
            </div>

            <Button type="submit" className="w-full rounded-xl h-12 text-base font-semibold mt-2">
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
