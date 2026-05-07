import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type MessageSortField = "updated_at" | "usage_count" | "title";
export type MessageSortOrder = "asc" | "desc";

export function MessageFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  onlyFavorites,
  onOnlyFavoritesChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  categories,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  onlyFavorites: boolean;
  onOnlyFavoritesChange: (value: boolean) => void;
  sortField: MessageSortField;
  onSortFieldChange: (value: MessageSortField) => void;
  sortOrder: MessageSortOrder;
  onSortOrderChange: (value: MessageSortOrder) => void;
  categories: string[];
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <Label className="text-xs text-zinc-600">Buscar</Label>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder='Buscar por título, conteúdo ou categoria (ex.: "follow-up")'
            className="mt-1.5 h-10"
          />
        </div>

        <div>
          <Label className="text-xs text-zinc-600">Categoria</Label>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="mt-1.5 h-10">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-zinc-600">Ordenar por</Label>
          <Select value={sortField} onValueChange={(value) => onSortFieldChange(value as MessageSortField)}>
            <SelectTrigger className="mt-1.5 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at">Última atualização</SelectItem>
              <SelectItem value="usage_count">Mais usadas</SelectItem>
              <SelectItem value="title">Título</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-zinc-600">Ordem</Label>
          <Select value={sortOrder} onValueChange={(value) => onSortOrderChange(value as MessageSortOrder)}>
            <SelectTrigger className="mt-1.5 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descendente</SelectItem>
              <SelectItem value="asc">Ascendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Button
          type="button"
          variant={onlyFavorites ? "default" : "outline"}
          className="h-9 rounded-xl"
          onClick={() => onOnlyFavoritesChange(!onlyFavorites)}
        >
          {onlyFavorites ? "Somente favoritos" : "Filtrar favoritos"}
        </Button>
      </div>
    </section>
  );
}
