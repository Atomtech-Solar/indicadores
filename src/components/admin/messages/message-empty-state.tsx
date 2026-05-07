import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MessageEmptyState({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
        <MessageSquareText className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900">
        {hasFilters ? "Nenhuma mensagem encontrada" : "Nenhuma mensagem cadastrada"}
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        {hasFilters
          ? "Ajuste os filtros para encontrar outras mensagens."
          : "Crie a primeira mensagem pronta para acelerar o atendimento comercial."}
      </p>
      {!hasFilters && (
        <Button type="button" className="mt-5 rounded-xl" onClick={onCreate}>
          Nova Mensagem
        </Button>
      )}
    </div>
  );
}
