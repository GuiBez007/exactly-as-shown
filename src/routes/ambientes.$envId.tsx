import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  FolderPlus,
  FolderInput,
  ExternalLink,
  Flag,
  Link2,
  LayoutGrid,
  List,
  Play,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SidePanel } from "@/components/ambientes/SidePanel";
import { EnvironmentIcon } from "@/components/ambientes/EnvironmentIcon";
import { DirectoryIcons, DirectoryTree } from "@/components/ambientes/DirectoryView";
import { AddDirectoryDialog, CreateFolderDialog } from "@/components/ambientes/DirectoryDialogs";
import { ExecutionDialog } from "@/components/ambientes/ExecutionDialog";
import { ChecklistCard } from "@/components/ambientes/ChecklistCard";
import { NewChecklistButton } from "@/components/ambientes/NewChecklistButton";
import {
  deleteDirectory,
  getExecution,
  setEnvironmentPriority,
  toggleAssociation,
  updateEnvironment,
  useStore,
} from "@/lib/store";
import { ACTION_TYPE_LABEL, PRIORITY_LABEL, type Directory, type Priority } from "@/lib/types";
import { fileSystem } from "@/services/filesystem";
import { runExecution } from "@/services/execution";

export const Route = createFileRoute("/ambientes/$envId")({
  validateSearch: (s: Record<string, unknown>): { folder?: string } => ({
    folder: typeof s.folder === "string" ? s.folder : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ambiente — Ambientes" },
      { name: "description", content: "Diretórios, listas e configuração de execução de um ambiente." },
      { property: "og:title", content: "Ambiente — Ambientes" },
      { property: "og:description", content: "Diretórios, listas e configuração de execução de um ambiente." },
    ],
  }),
  component: EnvironmentPage,
});

function EnvironmentPage() {
  const { envId } = Route.useParams();
  const { folder } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, ready } = useStore();
  const [view, setView] = useState<"icons" | "list">("list");
  const [addDir, setAddDir] = useState(false);
  const [newFolder, setNewFolder] = useState(false);
  const [execOpen, setExecOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const env = data.environments.find((e) => e.id === envId);
  if (!ready) return null;
  if (!env) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Ambiente não encontrado.</p>
        <Button asChild variant="outline"><Link to="/">Voltar aos ambientes</Link></Button>
      </div>
    );
  }

  const current = folder ? data.directories.find((d) => d.id === folder && d.environmentId === env.id) ?? null : null;
  const crumbs: Directory[] = [];
  for (let c = current; c; c = c.parentId ? data.directories.find((d) => d.id === c!.parentId) ?? null : null) crumbs.unshift(c);
  const goFolder = (id?: string) => navigate({ search: { folder: id } });

  const exec = getExecution(data, env.id);
  const showRun = !!exec && exec.config.enabled && exec.actions.length > 0;
  const linkedIds = data.environmentChecklists.filter((x) => x.environmentId === env.id).map((x) => x.checklistId);
  const lists = data.checklists.filter((l) => linkedIds.includes(l.id));

  const openTarget = current ?? crumbs[0] ?? data.directories.find((d) => d.environmentId === env.id && !d.parentId);

  async function openInWindows() {
    if (!openTarget) return toast.info("Adicione um diretório primeiro.");
    const r = await fileSystem.openInExplorer(openTarget.path);
    if (r.ok) toast.success(`Abrindo ${openTarget.path}`);
    else toast.warning("Requer versão desktop", { description: r.message });
  }

  async function run() {
    if (!exec) return;
    setRunning(true);
    const r = await runExecution(exec.actions);
    setRunning(false);
    if (r.done.length) toast.success(`${r.done.length} ação(ões) executada(s)`);
    if (r.needsDesktop.length)
      toast.warning(`${r.needsDesktop.length} ação(ões) não executada(s)`, {
        description: "Executar programas, .bat e terminal exige a versão desktop do Ambientes.",
      });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 p-4 md:p-6">
      <div className="flex gap-5">
        <main className="panel min-w-0 flex-1 p-5 md:p-6">
          <header className="mb-6 flex items-center gap-3">
            <Button asChild variant="outline" size="icon" aria-label="Voltar">
              {current ? (
                <button onClick={() => goFolder(current.parentId ?? undefined)}><ArrowLeft /></button>
              ) : (
                <Link to="/"><ArrowLeft /></Link>
              )}
            </Button>
            <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 font-mono text-sm">
              <Link to="/" className="text-muted-foreground hover:text-foreground">ambientes</Link>
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <button onClick={() => goFolder()} className={current ? "text-muted-foreground hover:text-foreground" : "font-semibold"}>
                {env.name.toLowerCase()}
              </button>
              {crumbs.map((c, i) => (
                <span key={c.id} className="flex items-center gap-1">
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                  <button onClick={() => goFolder(c.id)} className={i === crumbs.length - 1 ? "font-semibold" : "text-muted-foreground hover:text-foreground"}>
                    {c.name}
                  </button>
                </span>
              ))}
            </nav>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as typeof view)} variant="outline" size="sm">
              <ToggleGroupItem value="icons" aria-label="Ícones"><LayoutGrid /></ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Lista"><List /></ToggleGroupItem>
            </ToggleGroup>
          </header>

          <div className="mb-5 flex items-center gap-3">
            <EnvironmentIcon src={env.icon} name={env.name} className="size-11 rounded-lg" />
            <div>
              <h1 className="text-xl font-bold">{current ? current.name : env.name}</h1>
              <p className="font-mono text-xs text-muted-foreground">
                {current ? current.path : `prioridade ${PRIORITY_LABEL[env.priority].toLowerCase()}`}
              </p>
            </div>
          </div>

          {view === "icons" ? (
            <DirectoryIcons environmentId={env.id} parentId={current?.id ?? null} onOpenFolder={goFolder} />
          ) : (
            <DirectoryTree environmentId={env.id} parentId={current?.id ?? null} onOpenFolder={goFolder} />
          )}
        </main>

        <SidePanel>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Descrição</p>
            <Textarea
              key={env.id}
              defaultValue={env.description}
              placeholder="Descreva este ambiente…"
              className="min-h-20 resize-none text-sm"
              onBlur={(e) => e.target.value !== env.description && updateEnvironment(env.id, { description: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="panel" onClick={() => setNewFolder(true)}><FolderPlus /> Criar pasta</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="panel"><Plus /> Opções</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuItem onSelect={() => setAddDir(true)}><FolderInput /> Adicionar diretório</DropdownMenuItem>
                <DropdownMenuItem onSelect={openInWindows}><ExternalLink /> Abrir no Windows</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger><Flag className="mr-2 size-4" /> Alterar prioridade</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={String(env.priority)} onValueChange={(v) => setEnvironmentPriority(env.id, Number(v) as Priority)}>
                      {([3, 2, 1] as Priority[]).map((p) => (
                        <DropdownMenuRadioItem key={p} value={String(p)}>{PRIORITY_LABEL[p]}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onSelect={() => setExecOpen(true)}><Settings2 /> Configurar executável</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {showRun && exec && (
              <div className="rounded-xl border-[1.5px] border-highlight/50 bg-accent/40 p-2">
                <Button variant="highlight" className="w-full" onClick={run} disabled={running}>
                  <Play /> {exec.config.name}
                </Button>
                <ol className="mt-2 space-y-0.5 px-1">
                  {exec.actions.map((a, i) => (
                    <li key={a.id} className="truncate font-mono text-[11px] text-muted-foreground" title={a.value}>
                      {i + 1}. {ACTION_TYPE_LABEL[a.type]} {a.value}
                    </li>
                  ))}
                </ol>
                <button onClick={() => setExecOpen(true)} className="mt-1 px-1 text-xs text-accent-foreground underline-offset-2 hover:underline">
                  Editar configuração
                </button>
              </div>
            )}

            {current && (
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Remover "${current.name}" da estrutura? Nada é apagado no Windows.`)) {
                    goFolder(current.parentId ?? undefined);
                    deleteDirectory(current.id);
                  }
                }}
              >
                <Trash2 /> Deletar pasta
              </Button>
            )}
          </div>

          <div className="mt-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Listas</p>
              <AssociateMenu envId={env.id} linkedIds={linkedIds} />
            </div>
            {lists.length === 1 && <ChecklistCard list={lists[0]} defaultOpen />}
            {lists.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma lista associada.</p>}
            {lists.length > 1 && <p className="text-xs text-muted-foreground">{lists.length} listas associadas — veja abaixo.</p>}
          </div>
        </SidePanel>
      </div>

      {lists.length > 1 && (
        <section className="panel p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-[0.15em]">LISTAS</h2>
            <NewChecklistButton environmentId={env.id} />
          </div>
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((l) => <ChecklistCard key={l.id} list={l} defaultOpen />)}
          </div>
        </section>
      )}

      <AddDirectoryDialog open={addDir} onOpenChange={setAddDir} environmentId={env.id} />
      <CreateFolderDialog open={newFolder} onOpenChange={setNewFolder} environmentId={env.id} parent={current} />
      <ExecutionDialog open={execOpen} onOpenChange={setExecOpen} environmentId={env.id} />
    </div>
  );
}

function AssociateMenu({ envId, linkedIds }: { envId: string; linkedIds: string[] }) {
  const { data } = useStore();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"><Link2 /> Associar</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Listas exibidas neste ambiente</DropdownMenuLabel>
        {data.checklists.map((l) => (
          <DropdownMenuCheckboxItem
            key={l.id}
            checked={linkedIds.includes(l.id)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggleAssociation(envId, l.id)}
          >
            {l.name}
          </DropdownMenuCheckboxItem>
        ))}
        {data.checklists.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma lista criada</div>}
        <DropdownMenuSeparator />
        <div className="p-1"><NewChecklistButton environmentId={envId} /></div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
