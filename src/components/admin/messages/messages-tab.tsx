import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText, Plus, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { callAdminOps, callAdminOpsMutation } from "@/lib/admin-edge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCard, type AdminMessageItem } from "./message-card";
import { MessageDialog, type AdminMessageForm } from "./message-dialog";
import { MessageEmptyState } from "./message-empty-state";
import { MessageFilters, type MessageSortField, type MessageSortOrder } from "./message-filters";
import { MessageSkeleton } from "./messages-skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

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

function buildWhatsAppUrl(message: string, telefone?: string) {
  const digits = (telefone ?? "").replace(/\D/g, "");
  if (digits) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
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
  const [previewTargetType, setPreviewTargetType] = useState<"indicador" | "indicado">("indicador");
  const [selectedIndicadorId, setSelectedIndicadorId] = useState("");
  const [selectedIndicadoId, setSelectedIndicadoId] = useState("");
  const [indicadorPickerOpen, setIndicadorPickerOpen] = useState(false);

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

  const { data: recipientsData, isLoading: isLoadingRecipients } = useQuery({
    queryKey: ["admin-message-recipients"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<{
        indicadores: Array<{
          id: number;
          nome: string;
          whatsapp: string | null;
          indicados: Array<{
            id: number;
            nome: string;
            whatsapp: string | null;
          }>;
        }>;
      }>({
        action: "list_message_recipients",
      }),
  });

  const messages = data?.items ?? [];
  const indicadores = recipientsData?.indicadores ?? [];

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
  const indicadorSelecionado = useMemo(
    () => indicadores.find((item) => String(item.id) === selectedIndicadorId) ?? null,
    [indicadores, selectedIndicadorId],
  );
  const indicadosDoIndicador = indicadorSelecionado?.indicados ?? [];
  const indicadoSelecionado = useMemo(
    () => indicadosDoIndicador.find((item) => String(item.id) === selectedIndicadoId) ?? null,
    [indicadosDoIndicador, selectedIndicadoId],
  );
  const previewVars = useMemo(() => {
    const destinatario = previewTargetType === "indicado" ? indicadoSelecionado : indicadorSelecionado;
    return {
      nome: destinatario?.nome ?? "",
      empresa_cliente: "",
      telefone: destinatario?.whatsapp ?? "",
    };
  }, [previewTargetType, indicadorSelecionado, indicadoSelecionado]);

  useEffect(() => {
    if (!indicadores.length) {
      if (selectedIndicadorId) setSelectedIndicadorId("");
      return;
    }
    const hasSelected = indicadores.some((item) => String(item.id) === selectedIndicadorId);
    if (!hasSelected) {
      setSelectedIndicadorId(String(indicadores[0].id));
    }
  }, [indicadores, selectedIndicadorId]);

  useEffect(() => {
    if (previewTargetType !== "indicado") return;
    if (!indicadosDoIndicador.length) {
      if (selectedIndicadoId) setSelectedIndicadoId("");
      return;
    }
    const hasSelected = indicadosDoIndicador.some((item) => String(item.id) === selectedIndicadoId);
    if (!hasSelected) {
      setSelectedIndicadoId(String(indicadosDoIndicador[0].id));
    }
  }, [previewTargetType, indicadosDoIndicador, selectedIndicadoId]);

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
            <h4 className="text-sm font-semibold text-zinc-900">Destinatário do preview</h4>
            <p className="text-xs text-zinc-600 mt-0.5">
              Escolha se a mensagem será para um indicador ou para um indicado vinculado a ele.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="message-target-type" className="text-xs text-zinc-600">Tipo de destinatário</Label>
            <Select value={previewTargetType} onValueChange={(value: "indicador" | "indicado") => setPreviewTargetType(value)}>
              <SelectTrigger id="message-target-type" className="mt-1.5 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indicador">Indicador</SelectItem>
                <SelectItem value="indicado">Indicado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="message-target-indicador" className="text-xs text-zinc-600">
              Indicador
            </Label>
            <Popover open={indicadorPickerOpen} onOpenChange={setIndicadorPickerOpen} modal={false}>
              <PopoverTrigger asChild>
                <Button
                  id="message-target-indicador"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={indicadorPickerOpen}
                  disabled={isLoadingRecipients || indicadores.length === 0}
                  className="mt-1.5 h-9 w-full justify-between rounded-md px-3 font-normal shadow-sm"
                >
                  <span
                    className={cn(
                      "truncate text-left",
                      !indicadorSelecionado && "text-muted-foreground",
                    )}
                  >
                    {isLoadingRecipients
                      ? "Carregando..."
                      : indicadorSelecionado
                        ? indicadorSelecionado.nome
                        : "Selecione um indicador"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="z-[100] w-[min(28rem,calc(100vw-2rem))] p-0">
                {isLoadingRecipients ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Carregando indicadores…</div>
                ) : indicadores.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Nenhum indicador disponível.</div>
                ) : (
                  <Command>
                    <CommandInput placeholder="Buscar por nome ou WhatsApp…" className="h-10" />
                    <CommandList className="max-h-[min(280px,45vh)]">
                      <CommandEmpty>Nenhum indicador encontrado.</CommandEmpty>
                      <CommandGroup>
                        {indicadores.map((indicador) => {
                          const waDigits = (indicador.whatsapp ?? "").replace(/\D/g, "");
                          return (
                            <CommandItem
                              key={indicador.id}
                              value={`${indicador.nome} ${indicador.id} ${indicador.whatsapp ?? ""} ${waDigits}`}
                              keywords={[indicador.nome, waDigits, indicador.whatsapp ?? ""]}
                              onSelect={() => {
                                setSelectedIndicadorId(String(indicador.id));
                                setSelectedIndicadoId("");
                                setIndicadorPickerOpen(false);
                              }}
                            >
                              {indicador.nome}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </PopoverContent>
            </Popover>
          </div>
          {previewTargetType === "indicado" ? (
            <div>
              <Label htmlFor="message-target-indicado" className="text-xs text-zinc-600">Indicado vinculado</Label>
              <Select
                value={selectedIndicadoId || undefined}
                onValueChange={setSelectedIndicadoId}
                disabled={!indicadorSelecionado || indicadosDoIndicador.length === 0}
              >
                <SelectTrigger id="message-target-indicado" className="mt-1.5 h-9">
                  <SelectValue
                    placeholder={
                      !indicadorSelecionado
                        ? "Selecione um indicador"
                        : indicadosDoIndicador.length === 0
                          ? "Sem indicados vinculados"
                          : "Selecione um indicado"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {indicadosDoIndicador.map((indicado) => (
                    <SelectItem key={indicado.id} value={String(indicado.id)}>
                      {indicado.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <p className="text-xs font-medium text-zinc-700">Dados usados no preview</p>
              <p className="mt-1 text-sm text-zinc-800">
                <span className="font-medium">Nome:</span> {previewVars.nome || "Selecione um indicador"}
              </p>
              <p className="mt-0.5 text-sm text-zinc-800">
                <span className="font-medium">WhatsApp:</span> {previewVars.telefone || "Não informado"}
              </p>
            </div>
          )}
        </div>
        {previewTargetType === "indicado" && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <p className="text-xs font-medium text-zinc-700">Dados usados no preview</p>
            <p className="mt-1 text-sm text-zinc-800">
              <span className="font-medium">Nome:</span> {previewVars.nome || "Selecione um indicado"}
            </p>
            <p className="mt-0.5 text-sm text-zinc-800">
              <span className="font-medium">WhatsApp:</span> {previewVars.telefone || "Não informado"}
            </p>
          </div>
        )}
        {!isLoadingRecipients && indicadores.length === 0 && (
          <p className="mt-3 text-xs text-zinc-500">Nenhum indicador encontrado para montar o preview.</p>
        )}
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
                  buildWhatsAppUrl(applyPlaceholders(message.content, previewVars), previewVars.telefone),
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
