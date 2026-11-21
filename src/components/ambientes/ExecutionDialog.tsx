import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, FolderSearch, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { deleteExecutionConfig, getExecution, saveExecutionConfig, useStore, type ExecutionDraft } from "@/lib/store";
import { type ExecutionActionType } from "@/lib/types";
import { pickWindowsFolder } from "@/lib/run-action.functions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitFile(value: string) {
  const [name = "", ext = ""] = value.split("|");
  return { name, ext };
}

function joinFile(name: string, ext: string) {
  return `${name}|${ext}`;
}

const ACTION_OPTIONS: { value: ExecutionActionType; label: string }[] = [
  { value: "terminal", label: "abrir terminal" },
  { value: "file", label: "duplo clique em" },
  { value: "url", label: "abrir URL" },
  { value: "npm", label: "projeto npm" },
];

// ─── ExecutionDialog ───────────────────────────────────────────────────────────

export function ExecutionDialog({
  open,
  onOpenChange,
  environmentId,
  directoryId,
  targetName,
  initialPath,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  environmentId: string;
  directoryId?: string | null;
  targetName?: string;
  initialPath?: string;
}) {
  const { data } = useStore();
  const existing = getExecution(data, environmentId, directoryId ?? null);
  const [draft, setDraft] = useState<ExecutionDraft>({
    name: "Executar projeto",
    enabled: true,
    projectPath: "",
    actions: [],
  });
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (existing) {
      // Se tiver ações antigas com formato dir|dev|port, migra dir para projectPath e valor para port
      let inheritedPath = existing.config.projectPath || "";
      const actions = existing.actions.map((a) => {
        if (a.type === "npm" && a.value.includes("|")) {
          const parts = a.value.split("|");
          if (!inheritedPath && parts[0]) inheritedPath = parts[0].trim();
          return { type: a.type, value: (parts[2] ?? "").trim() };
        }
        return { type: a.type, value: a.value };
      });

      setDraft({
        name: existing.config.name,
        enabled: existing.config.enabled,
        projectPath: inheritedPath || initialPath || "",
        actions,
      });
    } else {
      const defaultPath = initialPath && (initialPath.includes(":\\") || initialPath.startsWith("/")) ? initialPath : "";
      setDraft({
        name: targetName ? `Executar ${targetName}` : "Executar projeto",
        enabled: true,
        projectPath: defaultPath,
        actions: [{ type: "npm", value: "" }],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, directoryId]);

  const setAction = (i: number, patch: Partial<ExecutionDraft["actions"][number]>) =>
    setDraft((d) => ({ ...d, actions: d.actions.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));

  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const a = [...d.actions];
      const j = i + dir;
      if (j < 0 || j >= a.length) return d;
      [a[i], a[j]] = [a[j]!, a[i]!];
      return { ...d, actions: a };
    });

  async function handlePickProjectFolder() {
    setPicking(true);
    try {
      const r = await pickWindowsFolder({ data: { title: "Selecione a pasta do projeto" } });
      if (r.ok && r.path) {
        setDraft((d) => ({ ...d, projectPath: r.path ?? "" }));
      }
    } finally {
      setPicking(false);
    }
  }

  const valid = draft.actions.some((a) => {
    if (a.type === "terminal") return true;
    if (a.type === "file" || a.type === "batch" || a.type === "executable" || a.type === "application") {
      return splitFile(a.value).name.trim().length > 0;
    }
    return a.value.trim().length > 0;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {targetName ? `Configurar executável — ${targetName}` : "Configurar executável"}
          </DialogTitle>
          <DialogDescription>
            {directoryId
              ? `Defina o que o botão executa para a pasta "${targetName ?? "selecionada"}", em ordem.`
              : "Defina as ações que o botão executa no ambiente, em ordem."}
          </DialogDescription>
        </DialogHeader>

        {/* 1. Nome do botão e Status Ativo */}
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="cfg-name">Nome do botão</Label>
            <Input id="cfg-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <label className="flex h-9 items-center gap-2 text-sm">
            <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} /> Ativo
          </label>
        </div>

        {/* 2. Diretório do projeto (com seletor de pasta do Windows) */}
        <div className="space-y-1.5">
          <Label htmlFor="cfg-project-path">Diretório do projeto</Label>
          <div className="flex items-center gap-1.5">
            <Input
              id="cfg-project-path"
              className="h-8 min-w-0 flex-1 font-mono text-xs"
              placeholder="Cole o caminho da pasta ou clique para selecionar →"
              value={draft.projectPath}
              onChange={(e) => setDraft({ ...draft, projectPath: e.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              title="Selecionar pasta pelo Windows"
              disabled={picking}
              onClick={handlePickProjectFolder}
            >
              {picking ? <Loader2 className="animate-spin" /> : <FolderSearch />}
            </Button>
          </div>
        </div>

        {/* 3. Ações */}
        <div className="space-y-2">
          <Label>Ações</Label>
          <ol className="space-y-2">
            {draft.actions.map((a, i) => {
              const currentType =
                a.type === "batch" || a.type === "executable" || a.type === "application" ? "file" : a.type;

              return (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] bg-surface p-2 sm:flex-nowrap">
                  <span className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>

                  {/* Dropdown com as 4 opções na ordem solicitada */}
                  <Select
                    value={currentType}
                    onValueChange={(v) =>
                      setAction(i, { type: v as ExecutionActionType, value: "" })
                    }
                  >
                    <SelectTrigger className="h-8 w-44 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 1. abrir terminal */}
                  {currentType === "terminal" && (
                    <div className="flex h-8 min-w-0 flex-1 items-center rounded-md border border-dashed px-2.5 font-mono text-xs text-muted-foreground truncate">
                      {draft.projectPath?.trim()
                        ? `Abre em: ${draft.projectPath}`
                        : "Abre cmd do diretório do projeto"}
                    </div>
                  )}

                  {/* 2. duplo clique em (nome do arquivo + extensão) */}
                  {currentType === "file" && (
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <Input
                        className="h-8 min-w-0 flex-1 font-mono text-xs"
                        placeholder="nome do arquivo"
                        value={splitFile(a.value).name}
                        onChange={(e) =>
                          setAction(i, { value: joinFile(e.target.value, splitFile(a.value).ext) })
                        }
                      />
                      <Input
                        className="h-8 w-28 shrink-0 font-mono text-xs"
                        placeholder="extensão"
                        value={splitFile(a.value).ext}
                        onChange={(e) =>
                          setAction(i, { value: joinFile(splitFile(a.value).name, e.target.value) })
                        }
                      />
                    </div>
                  )}

                  {/* 3. abrir URL */}
                  {currentType === "url" && (
                    <Input
                      className="h-8 min-w-0 flex-1 font-mono text-xs"
                      placeholder="ex: google.com"
                      value={a.value}
                      onChange={(e) => setAction(i, { value: e.target.value })}
                    />
                  )}

                  {/* 4. projeto npm (apenas porta) */}
                  {currentType === "npm" && (
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">Porta:</span>
                      <Input
                        className="h-8 min-w-0 flex-1 font-mono text-xs"
                        placeholder="ex: 5173"
                        value={a.value}
                        onChange={(e) => setAction(i, { value: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="flex shrink-0">
                    <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => move(i, 1)} disabled={i === draft.actions.length - 1} aria-label="Descer"><ArrowDown /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setDraft((d) => ({ ...d, actions: d.actions.filter((_, j) => j !== i) }))} aria-label="Remover"><X /></Button>
                  </div>
                </li>
              );
            })}
          </ol>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDraft((d) => ({ ...d, actions: [...d.actions, { type: "npm", value: "" }] }))}
          >
            <Plus /> Adicionar ação
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                deleteExecutionConfig(environmentId, directoryId ?? null);
                toast.success("Configuração removida");
                onOpenChange(false);
              }}
            >
              <Trash2 /> Remover configuração
            </Button>
          ) : <span />}
          <Button
            disabled={!valid}
            onClick={() => {
              saveExecutionConfig(environmentId, directoryId ?? null, {
                ...draft,
                name: draft.name.trim() || (targetName ? `Executar ${targetName}` : "Executar projeto"),
              });
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
