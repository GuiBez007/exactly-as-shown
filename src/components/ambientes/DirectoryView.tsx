import { FileText, Folder, Trash2 } from "lucide-react";
import { childrenOf, deleteDirectory, useStore } from "@/lib/store";
import type { Directory } from "@/lib/types";

interface Props {
  environmentId: string;
  parentId: string | null;
  onOpenFolder: (id: string) => void;
}

function confirmDelete(d: Directory) {
  if (confirm(`Remover "${d.name}" da estrutura do ambiente? Nada é apagado no Windows.`)) deleteDirectory(d.id);
}

export function DirectoryIcons({ environmentId, parentId, onOpenFolder }: Props) {
  const { data } = useStore();
  const items = childrenOf(data, environmentId, parentId);
  if (!items.length) return <Empty />;
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
      {items.map((d) => (
        <div key={d.id} className="group relative">
          <button
            onDoubleClick={() => d.type === "folder" && onOpenFolder(d.id)}
            onClick={() => d.type === "folder" && onOpenFolder(d.id)}
            className="flex w-full flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-accent/60"
            title={d.path}
          >
            {d.type === "folder" ? (
              <Folder className="size-12 fill-accent text-highlight" strokeWidth={1.25} />
            ) : (
              <FileText className="size-12 text-muted-foreground" strokeWidth={1.25} />
            )}
            <span className="w-full truncate text-center font-mono text-xs">{d.name}</span>
          </button>
          <DeleteBtn d={d} className="absolute top-1 right-1" />
        </div>
      ))}
    </div>
  );
}

export function DirectoryTree({ environmentId, parentId, onOpenFolder }: Props) {
  const { data } = useStore();
  const items = childrenOf(data, environmentId, parentId);
  if (!items.length) return <Empty />;
  return <Branch environmentId={environmentId} items={items} onOpenFolder={onOpenFolder} root />;
}

function Branch({
  environmentId,
  items,
  onOpenFolder,
  root,
}: {
  environmentId: string;
  items: Directory[];
  onOpenFolder: (id: string) => void;
  root?: boolean;
}) {
  const { data } = useStore();
  return (
    <ul className={root ? "font-mono text-sm" : "tree-branch ml-2 pl-4"}>
      {items.map((d) => {
        const kids = d.type === "folder" ? childrenOf(data, environmentId, d.id) : [];
        return (
          <li key={d.id}>
            <div className="group flex items-center gap-2 rounded-md py-0.5 pr-1 hover:bg-accent/50">
              {!root && <span className="-ml-4 h-px w-3 bg-border" />}
              {d.type === "folder" ? (
                <button className="flex items-center gap-1.5 hover:text-highlight" onClick={() => onOpenFolder(d.id)} title={d.path}>
                  <Folder className="size-4 fill-accent text-highlight" />
                  {d.name}/
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground" title={d.path}>
                  <FileText className="size-4" /> {d.name}
                </span>
              )}
              <DeleteBtn d={d} className="ml-auto" />
            </div>
            {kids.length > 0 && <Branch environmentId={environmentId} items={kids} onOpenFolder={onOpenFolder} />}
          </li>
        );
      })}
    </ul>
  );
}

function DeleteBtn({ d, className }: { d: Directory; className?: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        confirmDelete(d);
      }}
      aria-label={`Remover ${d.name}`}
      className={`rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive ${className ?? ""}`}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

function Empty() {
  return (
    <div className="rounded-xl border-[1.5px] border-dashed p-10 text-center text-sm text-muted-foreground">
      Nada aqui ainda. Use <strong>Criar pasta</strong> ou <strong>+ Opções → Adicionar diretório</strong>.
    </div>
  );
}
