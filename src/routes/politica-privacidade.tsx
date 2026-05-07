import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/politica-privacidade")({
  head: () => ({
    meta: [{ title: "Política de Privacidade — ATOM TECH" }],
  }),
  component: PoliticaPrivacidadePage,
});

function PoliticaPrivacidadePage() {
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
          <h1 className="text-2xl font-bold">Política de Privacidade</h1>
          <p className="mt-4 text-sm text-zinc-700 leading-relaxed">
            Na Atom Tech, privacidade, transparência e segurança são prioridades. Esta Política de
            Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos os dados dos
            usuários que acessam nossa plataforma.
          </p>
          <p className="mt-2 text-sm text-zinc-700 leading-relaxed">
            Ao utilizar nossos serviços, você concorda com os termos descritos abaixo.
          </p>

          <div className="mt-6 space-y-6 text-sm text-zinc-700 leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-zinc-900">1. Informações Coletadas</h2>
              <p className="mt-2">Podemos coletar informações fornecidas diretamente pelo usuário, incluindo:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Nome completo;</li>
                <li>E-mail;</li>
                <li>Telefone;</li>
                <li>Empresa;</li>
                <li>Informações comerciais relacionadas às indicações realizadas;</li>
                <li>Dados de navegação e interação com a plataforma.</li>
              </ul>
              <p className="mt-2">
                Também podemos coletar informações automaticamente por meio de cookies e tecnologias semelhantes.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">2. Uso das Informações</h2>
              <p className="mt-2">As informações coletadas são utilizadas para:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Cadastro e gerenciamento de usuários;</li>
                <li>Contato comercial e suporte;</li>
                <li>Avaliação de indicações e oportunidades;</li>
                <li>Processamento de comissões;</li>
                <li>Melhoria da plataforma e experiência do usuário;</li>
                <li>Cumprimento de obrigações legais e regulatórias.</li>
              </ul>
              <p className="mt-2">A Atom Tech não comercializa dados pessoais de seus usuários.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">3. Compartilhamento de Dados</h2>
              <p className="mt-2">Os dados poderão ser compartilhados apenas quando necessário para:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Execução dos serviços oferecidos;</li>
                <li>Processos comerciais relacionados aos projetos;</li>
                <li>Cumprimento de exigências legais;</li>
                <li>Proteção dos direitos da Atom Tech.</li>
              </ul>
              <p className="mt-2">
                Todos os parceiros e prestadores envolvidos seguem padrões adequados de segurança e
                confidencialidade.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">4. Armazenamento e Segurança</h2>
              <p className="mt-2">
                A Atom Tech adota medidas técnicas e administrativas para proteger os dados contra acessos
                não autorizados, perda, alteração ou divulgação indevida.
              </p>
              <p className="mt-2">
                Embora utilizemos boas práticas de segurança, nenhum sistema é completamente invulnerável. Por
                isso, recomendamos que o usuário também mantenha seus dados protegidos.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">5. Direitos do Usuário</h2>
              <p className="mt-2">O usuário poderá solicitar, a qualquer momento:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Acesso aos seus dados;</li>
                <li>Correção de informações incorretas;</li>
                <li>Exclusão de dados, quando aplicável;</li>
                <li>Revogação de consentimentos.</li>
              </ul>
              <p className="mt-2">
                Solicitações poderão ser realizadas pelos canais oficiais de atendimento da Atom Tech.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900">6. Atualizações desta Política</h2>
              <p className="mt-2">
                Esta Política poderá ser atualizada periodicamente para refletir melhorias na plataforma,
                alterações legais ou mudanças operacionais.
              </p>
              <p className="mt-2">Recomendamos a consulta regular desta página.</p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
