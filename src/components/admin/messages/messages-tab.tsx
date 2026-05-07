import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText, Plus } from "lucide-react";
import { toast } from "sonner";
import { callAdminOps, callAdminOpsMutation } from "@/lib/admin-edge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCard, type AdminMessageItem } from "./message-card";
import { MessageDialog, type AdminMessageForm } from "./message-dialog";
import { MessageEmptyState } from "./message-empty-state";
import { MessageFilters, type MessageSortField, type MessageSortOrder } from "./message-filters";
import { MessageSkeleton } from "./messages-skeleton";

const MESSAGE_CATEGORIES = [
  "Todos",
  "Primeiro Contato",
  "Follow-up",
  "Sem Resposta",
  "Comissão",
  "Energia Solar",
  "Carregador Veicular",
  "Fechamento",
  "Pós-venda",
  "Suporte",
] as const;

function applyPlaceholders(
  content: string,
  vars: { nome: string; empresa_cliente: string; telefone: string },
) {
  return content
    .replaceAll("{nome}", vars.nome)
    // Compatibilidade com mensagens antigas ({empresa}) e novo padrão ({empresa_cliente})
    .replaceAll("{empresa}", vars.empresa_cliente)
    .replaceAll("{empresa_cliente}", vars.empresa_cliente)
    .replaceAll("{telefone}", vars.telefone);
}

function buildWhatsAppUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function mapMessageToForm(message: AdminMessageItem): AdminMessageForm {
  return {
    title: message.title,
    category: message.category,
    content: message.content,
    isFavorite: message.is_favorite,
  };
}

export function MessagesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Todos");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortField, setSortField] = useState<MessageSortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<MessageSortOrder>("desc");
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<AdminMessageItem | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<AdminMessageItem | null>(null);
  const [previewVars, setPreviewVars] = useState({
    nome: "Carlos",
    empresa_cliente: "Solar Prime Engenharia",
    telefone: "(61) 99876-5432",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-messages", search, category, onlyFavorites, sortField, sortOrder],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<{
        items: AdminMessageItem[];
        total: number;
      }>({
        action: "list_messages",
        page: 1,
        limit: 200,
        search,
        category,
        onlyFavorites,
        sortBy: sortField,
        sortOrder,
      }),
  });

  const messages = data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: AdminMessageForm) =>
      callAdminOpsMutation({
        action: "create_message",
        title: payload.title,
        category: payload.category,
        content: payload.content,
        isFavorite: payload.isFavorite,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      setDialogOpen(false);
      toast.success("Mensagem criada com sucesso.");
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível criar a mensagem."),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; form: AdminMessageForm }) =>
      callAdminOpsMutation({
        action: "update_message",
        messageId: payload.id,
        title: payload.form.title,
        category: payload.form.category,
        content: payload.form.content,
        isFavorite: payload.form.isFavorite,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      setDialogOpen(false);
      setEditingMessage(null);
      toast.success("Mensagem atualizada.");
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível atualizar a mensagem."),
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: number) =>
      callAdminOpsMutation({
        action: "delete_message",
        messageId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      setDeletingMessage(null);
      toast.success("Mensagem excluída.");
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível excluir a mensagem."),
  });

  const favoriteMutation = useMutation({
    mutationFn: (payload: { id: number; isFavorite: boolean }) =>
      callAdminOpsMutation({
        action: "toggle_favorite",
        messageId: payload.id,
        isFavorite: payload.isFavorite,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível atualizar favorito."),
  });

  const incrementUsageMutation = useMutation({
    mutationFn: (messageId: number) =>
      callAdminOpsMutation({
        action: "increment_usage",
        messageId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    },
  });

  const initialFormValue = useMemo<AdminMessageForm>(() => {
    if (dialogMode === "edit" && editingMessage) return mapMessageToForm(editingMessage);
    return {
      title: "",
      category: "Primeiro Contato",
      content: "",
      isFavorite: false,
    };
  }, [dialogMode, editingMessage]);

  const hasFilters = Boolean(search.trim()) || category !== "Todos" || onlyFavorites;
  const total = data?.total ?? messages.length;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-zinc-900">Central de Mensagens</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Mensagens rápidas prontas para atendimento comercial da Atom Tech.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700">
              Total: {total}
            </div>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => {
                setDialogMode("create");
                setEditingMessage(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Mensagem
            </Button>
          </div>
        </div>
      </div>

      <MessageFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        onlyFavorites={onlyFavorites}
        onOnlyFavoritesChange={setOnlyFavorites}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        categories={[...MESSAGE_CATEGORIES]}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Variáveis dinâmicas para preview</h4>
            <p className="text-xs text-zinc-600 mt-0.5">
              Escolha os dados para substituir {"{nome}"}, {"{empresa_cliente}"} e {"{telefone}"}.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="message-var-nome" className="text-xs text-zinc-600">Nome</Label>
            <Input
              id="message-var-nome"
              className="mt-1.5 h-9"
              value={previewVars.nome}
              onChange={(event) =>
                setPreviewVars((prev) => ({ ...prev, nome: event.target.value }))
              }
              placeholder="Ex.: Carlos"
            />
          </div>
          <div>
            <Label htmlFor="message-var-empresa" className="text-xs text-zinc-600">Empresa do cliente</Label>
            <Input
              id="message-var-empresa"
              className="mt-1.5 h-9"
              value={previewVars.empresa_cliente}
              onChange={(event) =>
                setPreviewVars((prev) => ({ ...prev, empresa_cliente: event.target.value }))
              }
              placeholder="Ex.: Solar Prime"
            />
          </div>
          <div>
            <Label htmlFor="message-var-telefone" className="text-xs text-zinc-600">Telefone</Label>
            <Input
              id="message-var-telefone"
              className="mt-1.5 h-9"
              value={previewVars.telefone}
              onChange={(event) =>
                setPreviewVars((prev) => ({ ...prev, telefone: event.target.value }))
              }
              placeholder="Ex.: (61) 99876-5432"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && (
          <>
            <MessageSkeleton />
            <MessageSkeleton />
            <MessageSkeleton />
            <MessageSkeleton />
          </>
        )}

        {!isLoading &&
          messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              previewText={applyPlaceholders(message.content, previewVars)}
              onCopy={async () => {
                try {
                  await navigator.clipboard.writeText(applyPlaceholders(message.content, previewVars));
                  incrementUsageMutation.mutate(message.id);
                  toast.success("Mensagem copiada");
                } catch {
                  toast.error("Não foi possível copiar a mensagem.");
                }
              }}
              onEdit={() => {
                setDialogMode("edit");
                setEditingMessage(message);
                setDialogOpen(true);
              }}
              onDelete={() => setDeletingMessage(message)}
              onToggleFavorite={() =>
                favoriteMutation.mutate({
                  id: message.id,
                  isFavorite: !message.is_favorite,
                })
              }
              onOpenWhatsApp={() => {
                incrementUsageMutation.mutate(message.id);
                window.open(
                  buildWhatsAppUrl(applyPlaceholders(message.content, previewVars)),
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            />
          ))}
      </div>

      {!isLoading && messages.length === 0 && (
        <MessageEmptyState
          hasFilters={hasFilters}
          onCreate={() => {
            setDialogMode("create");
            setEditingMessage(null);
            setDialogOpen(true);
          }}
        />
      )}

      <MessageDialog
        open={dialogOpen}
        mode={dialogMode}
        categories={[...MESSAGE_CATEGORIES]}
        initialValue={initialFormValue}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingMessage(null);
        }}
        onSubmit={(form) => {
          if (dialogMode === "create") {
            createMutation.mutate(form);
            return;
          }
          if (!editingMessage) return;
          updateMutation.mutate({ id: editingMessage.id, form });
        }}
        previewMapper={(content) => applyPlaceholders(content, previewVars)}
      />

      <Dialog open={deletingMessage !== null} onOpenChange={(open) => !open && setDeletingMessage(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border-zinc-200">
          <DialogHeader>
            <DialogTitle>Excluir mensagem?</DialogTitle>
            <DialogDescription>
              Essa ação remove a mensagem <strong>{deletingMessage?.title}</strong> da central e não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDeletingMessage(null)} disabled={deleteMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deletingMessage && deleteMutation.mutate(deletingMessage.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
