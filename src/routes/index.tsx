import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SidePanel } from "@/components/ambientes/SidePanel";
import { EnvironmentIcon } from "@/components/ambientes/EnvironmentIcon";
import { EnvironmentDialog } from "@/components/ambientes/EnvironmentDialog";
import { ChecklistCard } from "@/components/ambientes/ChecklistCard";
import { NewChecklistButton } from "@/components/ambientes/NewChecklistButton";
import { exportDataJson, sortedEnvironments, useStore } from "@/lib/store";
import { PRIORITY_LABEL, type Environment } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ambientes — organize projetos, pastas e listas" },
      { name: "description", content: "Organize ambientes, diretórios de projetos e checklists em um só lugar." },
      { property: "og:title", content: "Ambientes — organize projetos, pastas e listas" },
      { property: "og:description", content: "Organize ambientes, diretórios de projetos e checklists em um só lugar." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data, ready } = useStore();
  const [view, setView] = useState<"icons" | "list">("icons");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Environment | undefined>();
  const envs = sortedEnvironments(data);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 p-4 md:p-6">
      <div className="flex gap-5">
        <main className="panel min-w-0 flex-1 p-5 md:p-8">
          <header className="mb-8 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-[0.2em] md:text-3xl">AMBIENTES</h1>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as typeof view)} variant="outline" size="sm">
              <ToggleGroupItem value="icons" aria-label="Ícones"><LayoutGrid /></ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Lista"><List /></ToggleGroupItem>
            </ToggleGroup>
          </header>

          {ready && envs.length === 0 && (
            <div className="rounded-xl border-[1.5px] border-dashed p-10 text-center text-muted-foreground">
              Nenhum ambiente ainda. Crie o primeiro pelo painel de opções.
            </div>
          )}

          <div className={cn("max-h-[30rem] overflow-y-auto pr-1", view === "icons" ? "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-2")}>
            {envs.map((e) =>
              view === "icons" ? (
                <div key={e.id} className="group relative">
                  <Link
                    to="/ambientes/$envId"
                    params={{ envId: e.id }}
                    className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] bg-surface p-5 transition-colors hover:border-highlight/60 hover:bg-accent/40"
                  >
                    <EnvironmentIcon src={e.icon} name={e.name} />
                    <span className="text-center text-sm font-medium">{e.name}</span>
                  </Link>
                  <EditBtn onClick={() => setEditing(e)} className="absolute top-2 right-2" />
                </div>
              ) : (
                <div key={e.id} className="relative flex items-center rounded-xl border-[1.5px] bg-surface hover:border-highlight/60">
                  <Link to="/ambientes/$envId" params={{ envId: e.id }} className="flex flex-1 items-center gap-4 p-3">
                    <EnvironmentIcon src={e.icon} name={e.name} className="size-10 rounded-lg" />
                    <span className="flex-1 font-medium">{e.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">prioridade {PRIORITY_LABEL[e.priority].toLowerCase()}</span>
                  </Link>
                  <EditBtn onClick={() => setEditing(e)} className="mr-3" />
                </div>
              ),
            )}
          </div>
        </main>

        <SidePanel>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tela inicial onde seus ambientes podem ser criados e configurados para facilitar no desenvolvimento.
          </p>
          <Button variant="panel" onClick={() => setCreating(true)}>
            <Plus /> Criar ambiente
          </Button>
          <Button variant="outline" onClick={() => exportDataJson(data)}>
            <Download /> Baixar dados (.json)
          </Button>
          <p className="mt-auto text-xs text-muted-foreground">
            Ambientes são categorias do app. Eles não criam pastas no Windows.
          </p>
        </SidePanel>
      </div>

      <section className="panel p-5 md:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-[0.15em]">LISTAS</h2>
          <NewChecklistButton />
        </div>
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.checklists.map((l) => (
            <ChecklistCard key={l.id} list={l} />
          ))}
        </div>
        {ready && data.checklists.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma lista. Crie uma com “Nova lista”.</p>
        )}
      </section>

      <EnvironmentDialog open={creating} onOpenChange={setCreating} />
      <EnvironmentDialog open={!!editing} onOpenChange={(o) => !o && setEditing(undefined)} environment={editing} />
    </div>
  );
}

function EditBtn({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label="Alterar nome e imagem"
      title="Alterar nome e imagem"
      className={cn(
        "flex size-7 items-center justify-center rounded-full border-[1.5px] bg-card text-foreground transition-colors hover:border-highlight hover:bg-highlight hover:text-highlight-foreground",
        className,
      )}
    >
      <Plus className="size-4" />
    </button>
  );
}
