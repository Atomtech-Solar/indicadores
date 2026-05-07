import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/termos-servico")({
  head: () => ({
    meta: [{ title: "Termos de Serviço — ATOM TECH" }],
  }),
  component: TermosServicoPage,
});

function TermosServicoPage() {
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
          <h1 className="text-2xl font-bold">Termos de Serviço</h1>
          <p className="mt-4 text-sm text-zinc-700 leading-relaxed">
            Bem-vindo à Atom Tech.
          </p>
          <p className="mt-2 text-sm text-zinc-700 leading-relaxed">
            Ao acessar ou utilizar nossa plataforma, o usuário declara estar ciente e concordar com os
            presentes Termos de Serviço.
          </p>

          <div className="mt-6 space-y-6 text-sm text-zinc-700 leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-zinc-900">1. Objetivo da Plataforma</h2>
              <p className="mt-2">
                A Atom Tech atua na intermediação e captação de oportunidades relacionadas a soluções de
                eficiência energética e tecnologia sustentável, incluindo:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Sistemas de energia solar;</li>
                <li>Carregadores para veículos elétricos;</li>
                <li>Projetos tecnológicos e energéticos;</li>
                <li>Soluções empresariais relacionadas ao setor.</li>
              </ul>
              <p className="mt-2">
                A plataforma permite que usuários realizem indicações de potenciais clientes ou empresas
                interessadas nos serviços oferecidos.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">2. Funcionamento das Indicações</h2>
              <p className="mt-2">
                O usuário poderá indicar pessoas ou empresas interessadas nos serviços disponibilizados pela
                Atom Tech.
              </p>
              <p className="mt-2">Após análise e eventual fechamento comercial:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>A Atom Tech poderá realizar pagamento de comissão;</li>
                <li>O valor e as condições dependerão do negócio efetivamente concluído;</li>
                <li>Não há garantia de aprovação, contratação ou fechamento das propostas indicadas.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">3. Responsabilidades do Usuário</h2>
              <p className="mt-2">O usuário compromete-se a:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Fornecer informações verdadeiras e atualizadas;</li>
                <li>Utilizar a plataforma de forma ética e legal;</li>
                <li>Não praticar spam, fraudes ou condutas abusivas;</li>
                <li>Respeitar a legislação vigente.</li>
              </ul>
              <p className="mt-2">
                O descumprimento destas condições poderá resultar em suspensão ou encerramento do acesso à
                plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">4. Limitação de Responsabilidade</h2>
              <p className="mt-2">
                A Atom Tech não garante ganhos financeiros, fechamento de contratos ou resultados específicos
                decorrentes das indicações realizadas.
              </p>
              <p className="mt-2">A empresa não se responsabiliza por:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Informações incorretas fornecidas por usuários;</li>
                <li>Perdas indiretas ou lucros cessantes;</li>
                <li>Instabilidades temporárias da plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">5. Propriedade Intelectual</h2>
              <p className="mt-2">
                Todos os conteúdos, marcas, elementos visuais, textos, logotipos e materiais da plataforma
                pertencem à Atom Tech, sendo proibida sua reprodução sem autorização prévia.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">6. Alterações nos Termos</h2>
              <p className="mt-2">
                A Atom Tech poderá modificar estes Termos de Serviço a qualquer momento, visando melhorias
                operacionais, adequações legais ou atualização dos serviços.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
