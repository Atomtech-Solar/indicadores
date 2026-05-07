import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/seguranca")({
  head: () => ({
    meta: [{ title: "Segurança — ATOM TECH" }],
  }),
  component: SegurancaPage,
});

function SegurancaPage() {
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
          <h1 className="text-2xl font-bold">Segurança</h1>
          <div className="mt-4 space-y-3 text-sm text-zinc-700 leading-relaxed">
            <p>
              A segurança das informações é um compromisso essencial da Atom Tech.
            </p>
            <p>
              Adotamos medidas técnicas, administrativas e organizacionais para proteger dados pessoais e
              informações comerciais contra:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Acessos não autorizados;</li>
              <li>Uso indevido;</li>
              <li>Alterações indevidas;</li>
              <li>Vazamentos;</li>
              <li>Destruição ou perda de dados.</li>
            </ul>
            <p>Nossos sistemas podem incluir:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Criptografia de dados;</li>
              <li>Controle de acesso;</li>
              <li>Monitoramento de atividades;</li>
              <li>Protocolos seguros de comunicação.</li>
            </ul>
            <p>
              Apesar dos esforços contínuos para garantir a segurança da plataforma, nenhum ambiente digital é
              totalmente livre de riscos. Por isso, recomendamos que os usuários mantenham boas práticas de
              segurança em seus dispositivos e contas.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
