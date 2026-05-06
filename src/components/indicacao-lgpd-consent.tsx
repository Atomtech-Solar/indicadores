import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Data exibida no termo — atualize quando o texto legal mudar. */
export const LGPD_PRIVACY_LAST_UPDATED = "6 de maio de 2026";

export function IndicacaoPrivacyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="indicacao-privacy-title"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onClose}
          aria-label="Voltar ao formulário"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 id="indicacao-privacy-title" className="text-base font-semibold text-foreground sm:text-lg">
          Política de Privacidade
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8 sm:px-6">
        <div className="mx-auto max-w-prose space-y-4 text-sm text-foreground leading-relaxed">
          <p className="font-semibold text-base">Termo de Consentimento para Tratamento de Dados Pessoais</p>

          <p>
            Ao utilizar este site, você concorda com a coleta e o uso de informações pessoais conforme descrito neste
            termo.
          </p>

          <p>
            Caso você forneça dados de terceiros, declara que possui autorização da pessoa informada para compartilhar
            essas informações, estando ciente de sua responsabilidade sobre esse envio.
          </p>

          <p>
            Os dados coletados, sejam seus ou de terceiros, como nome, e-mail, telefone e outras informações fornecidas,
            serão utilizados para:
          </p>

          <ul className="list-disc space-y-1 pl-5">
            <li>Realizar contato quando necessário;</li>
            <li>Processar solicitações e indicações;</li>
            <li>Melhorar os serviços oferecidos;</li>
            <li>Cumprir obrigações legais.</li>
          </ul>

          <p>
            As informações não serão vendidas ou compartilhadas com terceiros, exceto quando necessário para a execução
            do serviço ou por exigência legal.
          </p>

          <p>
            Adotamos medidas de segurança para proteger os dados contra acesso não autorizado, vazamentos ou uso
            indevido.
          </p>

          <p>O titular dos dados poderá solicitar, a qualquer momento:</p>

          <ul className="list-disc space-y-1 pl-5">
            <li>Acesso às informações;</li>
            <li>Correção de dados;</li>
            <li>Exclusão dos dados;</li>
            <li>Revogação do consentimento.</li>
          </ul>

          <p>Para exercer esses direitos, entre em contato pelos canais informados neste site.</p>

          <p>
            Ao enviar os dados, você declara estar ciente e de acordo com este termo, bem como confirma que possui
            autorização para o compartilhamento de dados de terceiros.
          </p>

          <p className="pt-2 text-muted-foreground">
            <span className="font-semibold text-foreground">Última atualização:</span> {LGPD_PRIVACY_LAST_UPDATED}
          </p>
        </div>
      </div>
    </div>
  );
}

type IndicacaoLgpdConsentFieldProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onOpenPrivacy: () => void;
  disabled?: boolean;
};

export function IndicacaoLgpdConsentField({
  id,
  checked,
  onCheckedChange,
  onOpenPrivacy,
  disabled,
}: IndicacaoLgpdConsentFieldProps) {
  return (
    <div className="rounded-[10px] border border-input bg-muted/30 p-3">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-foreground leading-snug">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-500"
        />
        <span>
          Ao marcar esta opção, declaro que possuo consentimento da pessoa cujos dados estão sendo informados,
          autorizando seu compartilhamento e tratamento conforme a{" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenPrivacy();
            }}
            className="font-semibold text-emerald-700 underline decoration-emerald-600/50 underline-offset-2 hover:text-emerald-800"
          >
            Política de Privacidade
          </button>
          .
        </span>
      </label>
    </div>
  );
}
