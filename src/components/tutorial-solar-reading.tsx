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
  "Não comece falando de placas ou potência — mostre quanto o cliente já pagou à concessionária e conduza a conversa com perguntas sobre retorno financeiro, não só sobre preço.";

const STRATEGIC_QUESTIONS = [
  "Você prefere continuar pagando esse valor todos os meses ou investir em um sistema que pode reduzir sua conta em até 95%?",
  "Se a parcela do financiamento ficar próxima do valor que você já paga na conta de luz, faria sentido trocar uma despesa por um investimento?",
  "Você quer continuar sujeito aos aumentos constantes da energia ou prefere ter mais controle sobre esse custo?",
  "Se o sistema praticamente se pagar com a economia gerada, qual seria o motivo para não instalar?",
];

export function TutorialSolarReading() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-4 rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
              Se preferir ler
            </p>
            <p className="text-sm leading-relaxed text-zinc-700">{EXCERPT}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50 hover:text-emerald-950"
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
          <DialogHeader className="shrink-0 border-b border-emerald-100 bg-emerald-50/60 px-6 py-4 text-left">
            <DialogTitle className="pr-8 text-lg font-semibold leading-snug text-zinc-900">
              Como Vender Energia Solar de Forma Inteligente
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-5 text-sm leading-relaxed text-zinc-700">
            <p>
              A venda de energia solar <strong className="text-zinc-900">não deve começar</strong> falando
              sobre placas, inversores ou potência do sistema. O que realmente convence o cliente é mostrar{" "}
              <strong className="text-zinc-900">quanto dinheiro ele está deixando na mesa</strong> todos os
              meses ao continuar pagando uma conta de energia alta.
            </p>

            <p className="mt-4">
              A primeira abordagem deve ser fazer o cliente refletir sobre o{" "}
              <strong className="text-zinc-900">custo acumulado ao longo dos anos</strong>.
            </p>

            <div className="mt-5 rounded-lg border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Pergunta-chave
              </p>
              <p className="mt-1 text-base font-medium text-zinc-900">
                “Quanto dinheiro você já pagou para a concessionária nos últimos anos?”
              </p>
            </div>

            <p className="mt-5">Se um cliente paga <strong className="text-zinc-900">R$ 1.000 por mês</strong> de energia, isso representa:</p>
            <ul className="mt-2 space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                <span>
                  <strong className="text-zinc-900">R$ 12.000</strong> por ano
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                <span>
                  <strong className="text-zinc-900">R$ 60.000</strong> em 5 anos
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                <span>
                  <strong className="text-zinc-900">R$ 300.000</strong> em 25 anos
                </span>
              </li>
            </ul>
            <p className="mt-3 text-zinc-600">
              Esse número costuma gerar impacto imediato, porque o cliente percebe que está destinando um
              valor muito alto para uma despesa que nunca retorna.
            </p>

            <p className="mt-5 font-medium text-zinc-900">
              A partir daí, conduza a conversa com perguntas estratégicas:
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
              Essas perguntas mudam o foco da conversa. O cliente deixa de enxergar apenas o preço e passa a
              analisar o <strong className="text-zinc-900">retorno financeiro</strong>.
            </p>

            <div className="mt-5 rounded-lg bg-zinc-900 px-4 py-3 text-zinc-50">
              <p>
                O principal argumento é simples:{" "}
                <strong className="text-white">conta de luz é uma despesa contínua</strong>. Energia solar é
                um investimento que gera economia por mais de 25 anos e ainda pode valorizar o imóvel.
              </p>
            </div>

            <blockquote className="mt-5 border-l-4 border-amber-400 bg-amber-50/80 px-4 py-3 italic text-zinc-800">
              “O mais caro não é instalar energia solar. O mais caro é continuar adiando uma decisão que
              poderia gerar economia todos os meses.”
            </blockquote>

            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Fechamento
              </p>
              <p className="mt-1 font-medium text-zinc-900">
                “Se eu mostrar que o investimento faz sentido financeiramente e cabe no seu orçamento, podemos
                avançar com a proposta?”
              </p>
            </div>

            <p className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-800">
              <strong className="text-zinc-900">Em resumo:</strong> vender energia solar é fazer o cliente
              perceber que ele já gasta dinheiro todos os meses. A decisão real é entre continuar pagando
              indefinidamente à concessionária ou investir em um sistema próprio que gera retorno e economia
              por décadas.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
