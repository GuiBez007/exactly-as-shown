import { useState } from "react";
import { ChevronDown, Link2, Maximize2, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChecklistModal } from "./ChecklistModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  addChecklistItem,
  checklistTotal,
  formatBRL,
  deleteChecklist,
  removeChecklistItem,
  renameChecklist,
  sortedEnvironments,
  sortedItems,
  toggleAssociation,
  toggleChecklistItem,
  useStore,
} from "@/lib/store";
import type { Checklist } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChecklistCard({ list, defaultOpen = false }: { list: Checklist; defaultOpen?: boolean }) {
  const { data } = useStore();
  const [open, setOpen] = useState(defaultOpen);
  const [text, setText] = useState("");
  const items = sortedItems(data, list.id);
  const [expanded, setExpanded] = useState(false);
  const total = checklistTotal(data, list.id);
  const hasPrices = items.some((i) => i.price != null);
  const done = items.filter((i) => i.completed).length;
  const linked = data.environmentChecklists.filter((x) => x.checklistId === list.id).map((x) => x.environmentId);
  const linkedEnvs = data.environments.filter((e) => linked.includes(e.id));

  return (
    <div className={cn("panel flex flex-col transition-colors", open && "border-highlight/50")}>
      <div className="flex items-start gap-2 p-4">
        <button className="flex flex-1 flex-col items-start gap-1 text-left" onClick={() => setOpen((o) => !o)}>
          <span className="flex items-center gap-2 font-semibold">
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !open && "-rotate-90")} />
            {list.name}
          </span>
          <span className="pl-6 font-mono text-xs text-muted-foreground">
            {done}/{items.length} concluídos
            {hasPrices && <span className="ml-2 text-highlight">· {formatBRL(total)}</span>}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Opções da lista">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="flex w-56 flex-col">
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link2 className="size-3.5" /> Associar a ambientes
            </DropdownMenuLabel>
            <div className="max-h-48 overflow-y-auto">
            {sortedEnvironments(data).map((e) => (
              <DropdownMenuCheckboxItem
                key={e.id}
                checked={linked.includes(e.id)}
                onSelect={(ev) => ev.preventDefault()}
                onCheckedChange={() => toggleAssociation(e.id, list.id)}
              >
                {e.name}
              </DropdownMenuCheckboxItem>
            ))}
            {data.environments.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum ambiente</div>
            )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setExpanded(true)}>
              <Maximize2 /> Abrir lista
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                const n = prompt("Novo nome da lista", list.name)?.trim();
                if (n) renameChecklist(list.id, n);
              }}
            >
              <Pencil /> Renomear
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                if (confirm(`Excluir a lista "${list.name}"?`)) deleteChecklist(list.id);
              }}
            >
              <Trash2 /> Excluir lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {linkedEnvs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3 pl-10">
          {linkedEnvs.map((e) => (
            <span key={e.id} className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
              {e.name}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="border-t px-4 py-3">
          <ul className="space-y-1">
            <TooltipProvider delayDuration={150}>
            {items.map((i) => {
              const row = (
                <li key={i.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-muted">
                  <Checkbox checked={i.completed} onCheckedChange={() => toggleChecklistItem(i.id)} />
                  <span className={cn("flex-1 text-sm", i.completed && "text-muted-foreground line-through")}>{i.text}</span>
                  {(i.price != null || i.description) && <span className="size-1.5 rounded-full bg-highlight/60" />}
                  <button
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    onClick={() => removeChecklistItem(i.id)}
                    aria-label="Remover item"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
              if (i.price == null && !i.description) return row;
              return (
                <Tooltip key={i.id}>
                  <TooltipTrigger asChild>{row}</TooltipTrigger>
                  <TooltipContent side="right" align="start" className="max-w-xs border bg-popover/90 text-popover-foreground backdrop-blur-sm">
                    {i.price != null && (
                      <div className={cn("font-mono text-sm font-semibold", i.includeInTotal === false ? "text-muted-foreground line-through" : "text-highlight")}>
                        {formatBRL(i.price)}
                      </div>
                    )}
                    {i.description && <pre className="mt-1 font-sans text-xs whitespace-pre-wrap text-muted-foreground">{i.description}</pre>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
            </TooltipProvider>
            {items.length === 0 && <li className="py-1 text-sm text-muted-foreground">Lista vazia.</li>}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              addChecklistItem(list.id, text.trim());
              setText("");
            }}
          >
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Novo item…" className="h-8" />
            <Button type="submit" size="sm" variant="secondary" disabled={!text.trim()}>
              <Plus />
            </Button>
          </form>
        </div>
      )}
      <ChecklistModal list={list} open={expanded} onOpenChange={setExpanded} />
    </div>
  );
}
