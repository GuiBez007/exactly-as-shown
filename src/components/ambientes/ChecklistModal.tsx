import { useState } from "react";
import { ArrowDown, ArrowUp, DollarSign, FileText, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addChecklistItem,
  checklistTotal,
  deletedItems,
  formatBRL,
  moveChecklistItem,
  purgeChecklistItem,
  removeChecklistItem,
  restoreChecklistItem,
  sortedItems,
  toggleChecklistItem,
  updateChecklistItem,
  useStore,
} from "@/lib/store";
import type { Checklist, ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChecklistModal({
  list,
  open,
  onOpenChange,
}: {
  list: Checklist;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data } = useStore();
  const [text, setText] = useState("");
  const items = sortedItems(data, list.id);
  const removed = deletedItems(data, list.id);
  const done = items.filter((i) => i.completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col gap-0 p-0">
        <div className="border-b p-6 pb-4">
          <DialogTitle className="text-xl font-bold">{list.name}</DialogTitle>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-mono text-muted-foreground">
              {done}/{items.length} concluídos
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-muted-foreground">Total da lista:</span>
              <span className="font-mono text-lg font-semibold text-highlight">{formatBRL(checklistTotal(data, list.id))}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <ul className="space-y-2">
            {items.map((i, idx) => (
              <ItemRow
                key={i.id}
                item={i}
                canUp={idx > 0 && items[idx - 1]!.completed === i.completed}
                canDown={idx < items.length - 1 && items[idx + 1]!.completed === i.completed}
              />
            ))}
            {items.length === 0 && <li className="text-sm text-muted-foreground">Lista vazia.</li>}
          </ul>

          {removed.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground">ITENS REMOVIDOS</h3>
              <ul className="space-y-1">
                {removed.map((i) => (
                  <li key={i.id} className="group flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-muted">
                    <span className="flex-1 text-sm text-muted-foreground line-through">{i.text}</span>
                    <Button variant="ghost" size="icon" className="size-7" title="Restaurar" onClick={() => restoreChecklistItem(i.id)}>
                      <RotateCcw className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 hover:text-destructive"
                      title="Apagar definitivamente"
                      onClick={() => purgeChecklistItem(i.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form
          className="flex gap-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            addChecklistItem(list.id, text.trim());
            setText("");
          }}
        >
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Novo item…" />
          <Button type="submit" variant="highlight" disabled={!text.trim()}>
            <Plus /> Adicionar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemRow({ item, canUp, canDown }: { item: ChecklistItem; canUp: boolean; canDown: boolean }) {
  const [mode, setMode] = useState<null | "desc" | "price">(null);
  const [desc, setDesc] = useState(item.description ?? "");
  const [price, setPrice] = useState(item.price != null ? String(item.price).replace(".", ",") : "");
  const [include, setInclude] = useState(item.includeInTotal !== false);

  const openMode = (m: "desc" | "price") => {
    setDesc(item.description ?? "");
    setPrice(item.price != null ? String(item.price).replace(".", ",") : "");
    setInclude(item.includeInTotal !== false);
    setMode(mode === m ? null : m);
  };

  const savePrice = () => {
    const n = parseFloat(price.replace(/\./g, "").replace(",", "."));
    updateChecklistItem(item.id, { price: price.trim() && !isNaN(n) ? n : undefined, includeInTotal: include });
    setMode(null);
  };

  return (
    <li className="group rounded-xl border bg-surface px-3 py-2.5 transition-colors hover:border-highlight/50">
      <div className="flex items-center gap-2.5">
        <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklistItem(item.id)} />
        <span className={cn("flex-1 text-sm font-medium", item.completed && "text-muted-foreground line-through")}>
          {item.text}
        </span>
        {item.price != null && (
          <span className={cn("font-mono text-xs", item.includeInTotal === false ? "text-muted-foreground line-through" : "text-highlight")}>
            {formatBRL(item.price)}
          </span>
        )}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button size="sm" variant={mode === "desc" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => openMode("desc")}>
            <FileText className="size-3.5" /> Descrição
          </Button>
          <Button size="sm" variant={mode === "price" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => openMode("price")}>
            <DollarSign className="size-3.5" /> Preço
          </Button>
        </div>
        <div className="flex flex-col">
          <button className="text-muted-foreground hover:text-foreground disabled:opacity-25" disabled={!canUp} onClick={() => moveChecklistItem(item.id, -1)} aria-label="Subir">
            <ArrowUp className="size-3.5" />
          </button>
          <button className="text-muted-foreground hover:text-foreground disabled:opacity-25" disabled={!canDown} onClick={() => moveChecklistItem(item.id, 1)} aria-label="Descer">
            <ArrowDown className="size-3.5" />
          </button>
        </div>
        <button className="text-muted-foreground hover:text-destructive" onClick={() => removeChecklistItem(item.id)} aria-label="Remover item">
          <X className="size-4" />
        </button>
      </div>

      {item.description && mode !== "desc" && (
        <pre className="mt-1.5 ml-7 font-sans text-xs whitespace-pre-wrap text-muted-foreground">{item.description}</pre>
      )}

      {mode === "desc" && (
        <div className="mt-2 ml-7 space-y-2">
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} placeholder="Descrição (quebras de linha são mantidas)" className="font-mono text-xs" autoFocus />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Cancelar</Button>
            <Button size="sm" variant="highlight" onClick={() => { updateChecklistItem(item.id, { description: desc.trim() ? desc : undefined }); setMode(null); }}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {mode === "price" && (
        <div className="mt-2 ml-7 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">R$</span>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" inputMode="decimal" className="h-8 w-28" autoFocus onKeyDown={(e) => e.key === "Enter" && savePrice()} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs has-[[data-state=checked]]:border-highlight has-[[data-state=checked]]:text-highlight">
            <Checkbox checked={include} onCheckedChange={(v) => setInclude(v === true)} className="rounded-full" />
            Entra na soma
          </label>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Cancelar</Button>
            <Button size="sm" variant="highlight" onClick={savePrice}>Salvar</Button>
          </div>
        </div>
      )}
    </li>
  );
}
