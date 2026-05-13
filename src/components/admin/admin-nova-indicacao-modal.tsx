import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { callAdminOps } from "@/lib/admin-edge";
import { mapTipoToDb, type IndicacaoTipo } from "@/lib/indicacao-domain";
import { makeUploadId } from "@/lib/upload-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IndicacaoLgpdConsentField, IndicacaoPrivacyModal } from "@/components/indicacao-lgpd-consent";
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

const MAX_INDICACAO_FOTOS = 4;
const MAX_INDICACAO_FOTO_BYTES = 5 * 1024 * 1024;

const INTERESSE_OPCOES = [
  { value: "usina_solar", label: "Usina solar" },
  { value: "carregador_veicular", label: "Carregador veicular" },
] as const;

function maskWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validateIndicacaoImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Envie apenas arquivo de imagem.";
  if (file.size > MAX_INDICACAO_FOTO_BYTES) return "Limite máximo de 5MB.";
  return null;
}

async function uploadIndicacaoComprovanteToUserFolder(targetAuthUuid: string, file: File): Promise<string> {
  const err = validateIndicacaoImageFile(file);
  if (err) throw new Error(err);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "jpg";
  const filePath = `${targetAuthUuid}/${Date.now()}-${makeUploadId()}.${safeExt}`;
  const { error: uploadError } = await supabase.storage.from("indicacoes-comprovantes").upload(filePath, file, {
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);
  return filePath;
}

type IndicadorRow = { id: number; nome: string; usuario_id: string; role: string; is_disabled: boolean };

export function AdminNovaIndicacaoModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [indicadorId, setIndicadorId] = useState("");
  const [indicadorPickerOpen, setIndicadorPickerOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    whatsapp: "",
    tipo: "Pessoa" as IndicacaoTipo,
    tipoProjetos: [] as string[],
    observacoes: "",
  });
  const [novaFotoList, setNovaFotoList] = useState<File[]>([]);
  const novaFotoInputRef = useRef<HTMLInputElement>(null);
  const [novaThumbUrls, setNovaThumbUrls] = useState<string[]>([]);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const { data: indicadores = [], isLoading: loadingIndicadores } = useQuery({
    queryKey: ["admin-indicadores-picker"],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await callAdminOps<{ items: IndicadorRow[]; total: number }>({
        action: "list_users",
        page: 1,
        limit: 500,
        search: "",
      });
      return res.items.filter((u) => u.role === "indicador" && !u.is_disabled);
    },
  });

  const indicadorSelecionado = useMemo(
    () => indicadores.find((i) => String(i.id) === indicadorId),
    [indicadores, indicadorId],
  );

  useEffect(() => {
    const urls = novaFotoList.map((f) => URL.createObjectURL(f));
    setNovaThumbUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [novaFotoList]);

  useEffect(() => {
    if (!open) {
      setIndicadorId("");
      setForm({
        nome: "",
        whatsapp: "",
        tipo: "Pessoa",
        tipoProjetos: [],
        observacoes: "",
      });
      setNovaFotoList([]);
      setLgpdConsent(false);
      setPrivacyModalOpen(false);
      setIndicadorPickerOpen(false);
    }
  }, [open]);

  const appendNovaFotosFromPicker = (list: FileList | null) => {
    if (!list?.length) return;
    const incoming = Array.from(list);
    const room = MAX_INDICACAO_FOTOS - novaFotoList.length;
    if (room <= 0) {
      toast.info("Limite de 4 fotos", { description: "Remova uma foto para adicionar outra." });
      if (novaFotoInputRef.current) novaFotoInputRef.current.value = "";
      return;
    }
    const accepted: File[] = [];
    for (const file of incoming) {
      if (accepted.length >= room) break;
      const err = validateIndicacaoImageFile(file);
      if (err) {
        toast.error(err);
        if (novaFotoInputRef.current) novaFotoInputRef.current.value = "";
        return;
      }
      accepted.push(file);
    }
    setNovaFotoList((prev) => [...prev, ...accepted].slice(0, MAX_INDICACAO_FOTOS));
    if (novaFotoInputRef.current) novaFotoInputRef.current.value = "";
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!indicadorSelecionado) throw new Error("Selecione o indicador que receberá esta indicação.");
      const nome = form.nome.trim();
      const whatsapp = form.whatsapp.trim();
      if (!nome || !whatsapp) throw new Error("Preencha nome e WhatsApp do indicado.");
      if (form.tipoProjetos.length === 0) throw new Error("Selecione ao menos uma solução de interesse.");
      if (!form.observacoes.trim()) throw new Error("Preencha o campo de observações.");

      const paths: (string | null)[] = [null, null, null, null];
      for (let i = 0; i < novaFotoList.length && i < MAX_INDICACAO_FOTOS; i++) {
        const f = novaFotoList[i];
        if (f) paths[i] = await uploadIndicacaoComprovanteToUserFolder(indicadorSelecionado.usuario_id, f);
      }

      const { error } = await supabase.from("indicacoes").insert({
        usuario_id: indicadorSelecionado.id,
        nome_indicado: nome,
        whatsapp,
        tipo: mapTipoToDb(form.tipo),
        tipo_projeto: form.tipoProjetos.length ? form.tipoProjetos.join(",") : null,
        observacoes: form.observacoes.trim() || null,
        conta_energia_url: paths[0],
        foto_padrao_url: paths[1],
        foto_extra_1_url: paths[2],
        foto_extra_2_url: paths[3],
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-fotos"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-indicacoes"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-indicacoes-elegiveis"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["indicacoes"] });
      toast.success("Indicação criada e vinculada ao indicador.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar a indicação."),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicadorId) {
      toast.error("Selecione o indicador.");
      return;
    }
    if (!form.nome.trim() || !form.whatsapp.trim()) {
      toast.error("Preencha nome e WhatsApp.");
      return;
    }
    if (form.tipoProjetos.length === 0) {
      toast.error("Selecione ao menos uma solução de interesse.");
      return;
    }
    if (!form.observacoes.trim()) {
      toast.error("Preencha o campo de observações.");
      return;
    }
    if (!lgpdConsent) {
      toast.error("É necessário aceitar o consentimento e a Política de Privacidade para enviar.");
      return;
    }
    mutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(92vh,720px)] overflow-y-auto sm:max-w-lg rounded-2xl border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-left text-zinc-900">Nova indicação (admin)</DialogTitle>
            <DialogDescription className="text-left text-zinc-600">
              Crie a indicação em nome de um indicador. Ele verá o projeto na própria lista, como se tivesse cadastrado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div>
              <Label htmlFor="admin-ind-vinculo-trigger" className="text-sm font-medium">
                Vincular a indicador
              </Label>
              <Popover open={indicadorPickerOpen} onOpenChange={setIndicadorPickerOpen} modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    id="admin-ind-vinculo-trigger"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={indicadorPickerOpen}
                    disabled={loadingIndicadores || mutation.isPending}
                    className="mt-1.5 h-11 w-full justify-between rounded-md px-3 font-normal shadow-sm"
                  >
                    <span
                      className={cn(
                        "truncate text-left",
                        !indicadorSelecionado && "text-muted-foreground",
                      )}
                    >
                      {loadingIndicadores
                        ? "Carregando indicadores…"
                        : indicadorSelecionado
                          ? indicadorSelecionado.nome
                          : "Selecione o indicador"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="z-[100] w-[min(28rem,calc(100vw-2rem))] p-0">
                  {loadingIndicadores ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Carregando indicadores…</div>
                  ) : indicadores.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Nenhum indicador disponível.</div>
                  ) : (
                    <Command>
                      <CommandInput placeholder="Buscar por nome ou ID…" className="h-10" />
                      <CommandList className="max-h-[min(280px,45vh)]">
                        <CommandEmpty>Nenhum indicador encontrado.</CommandEmpty>
                        <CommandGroup>
                          {indicadores.map((u) => (
                            <CommandItem
                              key={u.id}
                              value={String(u.id)}
                              keywords={[u.nome]}
                              onSelect={() => {
                                setIndicadorId(String(u.id));
                                setIndicadorPickerOpen(false);
                              }}
                            >
                              {u.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  )}
                </PopoverContent>
              </Popover>
              <p className="mt-1 text-xs text-zinc-500">Apenas contas com perfil indicador ativo.</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Tipo</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                {(["Pessoa", "Empresa"] as IndicacaoTipo[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, tipo: t })}
                    className={`rounded-lg py-2 text-sm font-semibold transition ${
                      form.tipo === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="admin-ind-nome" className="text-sm font-medium">
                Nome do indicado
              </Label>
              <Input
                id="admin-ind-nome"
                required
                value={form.nome}
                placeholder="Nome do cliente"
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="mt-1.5 h-11 rounded-[10px]"
              />
            </div>
            <div>
              <Label htmlFor="admin-ind-wa" className="text-sm font-medium">
                WhatsApp do indicado
              </Label>
              <Input
                id="admin-ind-wa"
                required
                value={form.whatsapp}
                placeholder="(11) 99999-9999"
                onChange={(e) => setForm({ ...form, whatsapp: maskWhatsapp(e.target.value) })}
                className="mt-1.5 h-11 rounded-[10px]"
              />
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
              Fotos opcionais (até 4, 5MB cada). Serão salvas na pasta do indicador selecionado.
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fotos do local (opcional)</Label>
              <div className="rounded-xl border border-input bg-muted/30 p-3">
                <input
                  ref={novaFotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => appendNovaFotosFromPicker(e.target.files)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  {novaThumbUrls.map((url, i) => (
                    <div
                      key={url}
                      className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-border bg-background shadow-sm"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNovaFotoList((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white shadow hover:bg-black/85"
                        aria-label="Remover foto"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {novaFotoList.length < MAX_INDICACAO_FOTOS && (
                    <button
                      type="button"
                      onClick={() => novaFotoInputRef.current?.click()}
                      className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-emerald-300/80 bg-emerald-50/50 text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="px-1 text-center text-[10px] font-medium leading-tight">Adicionar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Solução de interesse</Label>
              <div className="mt-2 space-y-2 rounded-[10px] border border-input bg-background p-3">
                {INTERESSE_OPCOES.map((opcao) => {
                  const checked = form.tipoProjetos.includes(opcao.value);
                  return (
                    <label key={opcao.value} className="flex cursor-pointer items-center gap-3 text-sm text-zinc-800">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            tipoProjetos: e.target.checked
                              ? [...prev.tipoProjetos, opcao.value]
                              : prev.tipoProjetos.filter((v) => v !== opcao.value),
                          }))
                        }
                        className="h-4 w-4 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{opcao.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="admin-ind-obs" className="text-sm font-medium">
                Observações
              </Label>
              <Textarea
                id="admin-ind-obs"
                required
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Contexto do lead (consumo, urgência, perfil do imóvel…)"
                className="mt-1.5 min-h-[120px] resize-none rounded-[10px]"
              />
            </div>

            <IndicacaoLgpdConsentField
              id="admin-nova-ind-lgpd"
              checked={lgpdConsent}
              onCheckedChange={setLgpdConsent}
              onOpenPrivacy={() => setPrivacyModalOpen(true)}
              disabled={mutation.isPending}
            />

            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                <Send className="mr-2 h-4 w-4" />
                {mutation.isPending ? "Salvando…" : "Criar indicação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <IndicacaoPrivacyModal open={privacyModalOpen} onClose={() => setPrivacyModalOpen(false)} />
    </>
  );
}
