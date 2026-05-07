import { Copy, ExternalLink, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export type AdminMessageItem = {
  id: number;
  title: string;
  category: string;
  content: string;
  is_favorite: boolean;
  usage_count: number;
  updated_at: string;
  created_by_name: string;
};

export function MessageCard({
  message,
  previewText,
  onCopy,
  onEdit,
  onDelete,
  onToggleFavorite,
  onOpenWhatsApp,
}: {
  message: AdminMessageItem;
  previewText: string;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onOpenWhatsApp: () => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 shadow-sm transition hover:shadow-md hover:-translate-y-[1px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-zinc-900">{message.title}</h4>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full text-[11px]">
              {message.category}
            </Badge>
            {message.is_favorite && (
              <Badge className="rounded-full text-[11px] bg-amber-500 hover:bg-amber-500">
                Favorita
              </Badge>
            )}
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant={message.is_favorite ? "default" : "outline"}
          className="h-8 px-2.5"
          onClick={onToggleFavorite}
        >
          <Star className={`h-4 w-4 ${message.is_favorite ? "fill-current" : ""}`} />
        </Button>
      </div>

      <p className="mt-4 text-sm text-zinc-700 whitespace-pre-wrap line-clamp-4">{previewText}</p>

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <p>Usada {message.usage_count}x</p>
        <p>Atualizada em {formatDate(message.updated_at)}</p>
      </div>
      <p className="mt-1 text-xs text-zinc-500">Criada por {message.created_by_name}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={onCopy}>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copiar
        </Button>
        <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={onOpenWhatsApp}>
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Abrir WhatsApp
        </Button>
        <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Editar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 px-3 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
          onClick={onDelete}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Excluir
        </Button>
      </div>
    </article>
  );
}
