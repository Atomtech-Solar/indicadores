import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/politica-cookies")({
  head: () => ({
    meta: [{ title: "Política de Cookies — ATOM TECH" }],
  }),
  component: PoliticaCookiesPage,
});

function PoliticaCookiesPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a página inicial
        </Link>

        <section className="mt-6 rounded-2xl border border-border bg-card p-6 md:p-8">
          <h1 className="text-2xl font-bold">Política de Cookies</h1>
          <div className="mt-4 space-y-4 text-sm text-zinc-700 leading-relaxed">
            <p>
              A Atom Tech utiliza cookies e tecnologias semelhantes para melhorar a experiência de navegação dos
              usuários.
            </p>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">O que são Cookies?</h2>
              <p className="mt-2">
                Cookies são pequenos arquivos armazenados no dispositivo do usuário que permitem reconhecer
                preferências, melhorar funcionalidades e analisar o desempenho do site.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">Como Utilizamos os Cookies</h2>
              <p className="mt-2">Os cookies podem ser utilizados para:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Melhorar a navegação e desempenho;</li>
                <li>Memorizar preferências do usuário;</li>
                <li>Gerar estatísticas de acesso;</li>
                <li>Otimizar campanhas e funcionalidades;</li>
                <li>Garantir segurança da plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">Gerenciamento de Cookies</h2>
              <p className="mt-2">
                O usuário poderá desativar os cookies diretamente nas configurações do navegador.
              </p>
              <p className="mt-2">
                No entanto, a desativação poderá impactar determinadas funcionalidades e recursos da plataforma.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
