import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { deleteExecutionConfig, getExecution, saveExecutionConfig, useStore, type ExecutionDraft } from "@/lib/store";
import { ACTION_TYPE_LABEL, type ExecutionActionType } from "@/lib/types";

const PLACEHOLDER: Record<ExecutionActionType, string> = {
  terminal: "C:\\Projetos\\MeuApp",
  batch: "C:\\Projetos\\MeuApp\\backend.bat",
  executable: "C:\\Programas\\app.exe",
  application: "code C:\\Projetos\\MeuApp",
  url: "http://localhost:3000",
};

export function ExecutionDialog({
  open,
  onOpenChange,
  environmentId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  environmentId: string;
}) {
  const { data } = useStore();
  const existing = getExecution(data, environmentId);
  const [draft, setDraft] = useState<ExecutionDraft>({ name: "Executar projeto", enabled: true, actions: [] });

  useEffect(() => {
    if (!open) return;
    setDraft(
      existing
        ? { name: existing.config.name, enabled: existing.config.enabled, actions: existing.actions.map((a) => ({ type: a.type, value: a.value })) }
        : { name: "Executar projeto", enabled: true, actions: [{ type: "terminal", value: "" }] },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setAction = (i: number, patch: Partial<ExecutionDraft["actions"][number]>) =>
    setDraft((d) => ({ ...d, actions: d.actions.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));
  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const a = [...d.actions];
      const j = i + dir;
      if (j < 0 || j >= a.length) return d;
      [a[i], a[j]] = [a[j], a[i]];
      return { ...d, actions: a };
    });

  const valid = draft.actions.some((a) => a.value.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar executável</DialogTitle>
          <DialogDescription>
            Defina as ações que o botão executa, em ordem. A execução de programas e arquivos exige a versão desktop.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="cfg-name">Nome do botão</Label>
            <Input id="cfg-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <label className="flex h-9 items-center gap-2 text-sm">
            <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} /> Ativo
          </label>
        </div>

        <div className="space-y-2">
          <Label>Ações</Label>
          <ol className="space-y-2">
            {draft.actions.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] bg-surface p-2 sm:flex-nowrap">
                <span className="w-5 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
                <Select value={a.type} onValueChange={(v) => setAction(i, { type: v as ExecutionActionType })}>
                  <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACTION_TYPE_LABEL) as ExecutionActionType[]).map((t) => (
                      <SelectItem key={t} value={t}>{ACTION_TYPE_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input className="h-8 min-w-0 flex-1 font-mono text-xs" value={a.value} placeholder={PLACEHOLDER[a.type]} onChange={(e) => setAction(i, { value: e.target.value })} />
                <div className="flex">
                  <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => move(i, 1)} disabled={i === draft.actions.length - 1} aria-label="Descer"><ArrowDown /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setDraft((d) => ({ ...d, actions: d.actions.filter((_, j) => j !== i) }))} aria-label="Remover"><X /></Button>
                </div>
              </li>
            ))}
          </ol>
          <Button type="button" variant="outline" size="sm" onClick={() => setDraft((d) => ({ ...d, actions: [...d.actions, { type: "url", value: "" }] }))}>
            <Plus /> Adicionar ação
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                deleteExecutionConfig(environmentId);
                toast.success("Configuração removida");
                onOpenChange(false);
              }}
            >
              <Trash2 /> Remover configuração
            </Button>
          ) : (
            <span />
          )}
          <Button
            disabled={!valid}
            onClick={() => {
              saveExecutionConfig(environmentId, { ...draft, name: draft.name.trim() || "Executar projeto" });
              toast.success("Configuração salva");
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
