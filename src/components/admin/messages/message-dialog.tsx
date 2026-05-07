import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AdminMessageForm = {
  title: string;
  category: string;
  content: string;
  isFavorite: boolean;
};

export function MessageDialog({
  open,
  mode,
  categories,
  initialValue,
  isSubmitting,
  onOpenChange,
  onSubmit,
  previewMapper,
}: {
  open: boolean;
  mode: "create" | "edit";
  categories: string[];
  initialValue: AdminMessageForm;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: AdminMessageForm) => void;
  previewMapper: (content: string) => string;
}) {
  const [form, setForm] = useState<AdminMessageForm>(initialValue);

  useEffect(() => {
    if (open) setForm(initialValue);
  }, [open, initialValue]);

  const contentLength = useMemo(() => form.content.length, [form.content]);

  const previewText = useMemo(() => previewMapper(form.content), [form.content, previewMapper]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl border-zinc-200">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova mensagem" : "Editar mensagem"}</DialogTitle>
          <DialogDescription>
            Crie mensagens rápidas e profissionais para atendimento comercial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="message-title">Título</Label>
              <Input
                id="message-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1.5 h-10"
                placeholder="Ex.: Follow-up 48h"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="message-category">Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="message-category" className="mt-1.5 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c !== "Todos")
                    .map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="message-content">Conteúdo</Label>
            <Textarea
              id="message-content"
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              className="mt-1.5 min-h-36"
              placeholder="Digite sua mensagem. Ex.: Olá {nome}, tudo bem com a {empresa_cliente}? Posso falar no {telefone}?"
              maxLength={5000}
            />
            <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              Use variáveis automáticas no texto:
              {" "}
              <span className="font-mono text-zinc-800">{"{nome}"}</span>,
              {" "}
              <span className="font-mono text-zinc-800">{"{empresa_cliente}"}</span>,
              {" "}
              <span className="font-mono text-zinc-800">{"{telefone}"}</span>.
              <br />
              Exemplo: <span className="font-mono text-zinc-800">Olá {"{nome}"}, recebi seu interesse para a {"{empresa_cliente}"}.</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 text-right">{contentLength}/5000</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-sm text-zinc-700">Marcar como favorita</p>
            <Button
              type="button"
              variant={form.isFavorite ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setForm((prev) => ({ ...prev, isFavorite: !prev.isFavorite }))}
            >
              {form.isFavorite ? "Favorita" : "Normal"}
            </Button>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-xs font-medium text-zinc-600">Preview em tempo real</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{previewText}</p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : mode === "create" ? "Criar mensagem" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
