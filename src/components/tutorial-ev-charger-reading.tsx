import { useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EXCERPT =
  "Não limite a conversa a “carregar o próprio carro” — mostre conveniência para quem tem VE ou uma nova fonte de receita para quem quer monetizar recargas no estabelecimento.";

const STRATEGIC_QUESTIONS = [
  "Você quer mais praticidade para o seu veículo ou está buscando uma oportunidade de negócio?",
  "Seu estabelecimento recebe clientes que permanecem no local por algum tempo?",
  "Você gostaria de oferecer um diferencial competitivo para atrair mais clientes?",
  "Já pensou em cobrar pela recarga e gerar receita com uma estrutura automatizada?",
  "Você quer preparar seu negócio para um mercado que cresce todos os anos?",
  "Se pudesse instalar uma solução que agrega valor ao imóvel e ainda pode gerar retorno financeiro, isso faria sentido para você?",
];

const BENEFITS_OWN_USE = [
  "Comodidade",
  "Autonomia",
  "Recarga mais econômica",
  "Integração com energia solar",
];

const BENEFITS_MONETIZATION = [
  "Nova fonte de receita",
  "Diferencial competitivo",
  "Atração e retenção de clientes",
  "Valorização do negócio",
  "Posicionamento inovador",
];

const IMPACT_PHRASES = [
  "Os veículos elétricos estão crescendo rapidamente. Quem instalar infraestrutura agora estará na frente do mercado.",
  "Você pode usar essa tecnologia para economizar ou para gerar receita.",
  "Enquanto muitos veem apenas um carregador, outros enxergam uma oportunidade de negócio.",
  "Quem se prepara antes tende a capturar as melhores oportunidades.",
];

export function TutorialEvChargerReading() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-4 rounded-lg border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white p-4">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-800">Se preferir ler</p>
            <p className="text-sm leading-relaxed text-zinc-700">{EXCERPT}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-sky-200 bg-white text-sky-900 hover:bg-sky-50 hover:text-sky-950"
              onClick={() => setOpen(true)}
            >
              Ver mais
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(90vh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-sky-100 bg-sky-50/60 px-6 py-4 text-left">
            <DialogTitle className="pr-8 text-lg font-semibold leading-snug text-zinc-900">
              Como Vender Carregadores Veiculares de Forma Estratégica
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-5 text-sm leading-relaxed text-zinc-700">
            <p>
              A venda de carregadores veiculares <strong className="text-zinc-900">não deve se limitar</strong> à
              ideia de “carregar o próprio carro”. O maior potencial de venda está em mostrar que o carregador
              pode ser tanto uma <strong className="text-zinc-900">solução de conveniência</strong> quanto uma{" "}
              <strong className="text-zinc-900">nova fonte de receita</strong>.
            </p>

            <p className="mt-5 font-medium text-zinc-900">Existem dois perfis principais de clientes:</p>
            <ol className="mt-3 space-y-2">
              <li className="flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                  1
                </span>
                <span>
                  Quem possui um veículo elétrico e deseja carregar com praticidade em casa ou na empresa.
                </span>
              </li>
              <li className="flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                  2
                </span>
                <span>
                  Quem deseja instalar carregadores para disponibilizar ao público e monetizar com as
                  recargas.
                </span>
              </li>
            </ol>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border-l-4 border-sky-500 bg-sky-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Uso próprio</p>
                <p className="mt-1 font-medium text-zinc-900">
                  “Quanto vale para você ter a liberdade de carregar seu carro onde quiser, sem depender de
                  terceiros?”
                </p>
              </div>
              <div className="rounded-lg border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">Investimento</p>
                <p className="mt-1 font-medium text-zinc-900">
                  “Você já pensou em transformar o crescimento dos carros elétricos em uma nova fonte de
                  renda?”
                </p>
              </div>
            </div>

            <p className="mt-5">
              O mercado de veículos elétricos está em forte expansão, e a infraestrutura de recarga ainda é
              limitada em muitas regiões. Isso cria uma oportunidade real para{" "}
              <strong className="text-zinc-900">
                empresas, estacionamentos, condomínios, hotéis, restaurantes e postos de combustível
              </strong>
              .
            </p>

            <p className="mt-5 font-medium text-zinc-900">
              Perguntas estratégicas para identificar o potencial do cliente:
            </p>
            <ul className="mt-3 space-y-2">
              {STRATEGIC_QUESTIONS.map((question) => (
                <li
                  key={question}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-zinc-700 shadow-sm"
                >
                  “{question}”
                </li>
              ))}
            </ul>

            <p className="mt-5">
              Essas perguntas posicionam o carregador como um{" "}
              <strong className="text-zinc-900">ativo estratégico</strong>.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                  Benefícios — uso próprio
                </p>
                <ul className="mt-2 space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                  {BENEFITS_OWN_USE.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
                  Benefícios — monetização
                </p>
                <ul className="mt-2 space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                  {BENEFITS_MONETIZATION.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-5 font-medium text-zinc-900">Frases de impacto:</p>
            <div className="mt-3 space-y-2">
              {IMPACT_PHRASES.map((phrase) => (
                <blockquote
                  key={phrase}
                  className="border-l-4 border-amber-400 bg-amber-50/80 px-4 py-2.5 italic text-zinc-800"
                >
                  “{phrase}”
                </blockquote>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Fechamento</p>
              <p className="mt-1 font-medium text-zinc-900">
                “Se eu mostrar uma solução que pode trazer praticidade ou até gerar uma nova fonte de renda,
                podemos avançar com a proposta?”
              </p>
            </div>

            <p className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-800">
              <strong className="text-zinc-900">Em resumo:</strong> vender carregadores veiculares é mostrar ao
              cliente que ele pode tanto ganhar autonomia para recarregar seu próprio veículo quanto aproveitar
              o crescimento da mobilidade elétrica para criar um negócio rentável e diferenciado.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
