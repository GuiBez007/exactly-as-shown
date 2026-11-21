import { useState } from "react";
import { FileText, Folder, GripVertical, Play } from "lucide-react";
import { childrenOf, getExecution, reorderDirectories, useStore } from "@/lib/store";
import type { Directory } from "@/lib/types";

interface Props {
  environmentId: string;
  parentId: string | null;
  onOpenFolder: (id: string) => void;
  onRunDirectory?: (directoryId: string) => void;
}

export function DirectoryIcons({ environmentId, parentId, onOpenFolder, onRunDirectory }: Props) {
  const { data } = useStore();
  const items = childrenOf(data, environmentId, parentId);
  if (!items.length) return <Empty />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {items.map((d) => {
        const exec = getExecution(data, environmentId, d.id);
        const hasExec = !!exec && exec.config.enabled && exec.actions.length > 0;
        return (
          <div key={d.id} className="group relative">
            <button
              onDoubleClick={() => d.type === "folder" && onOpenFolder(d.id)}
              onClick={() => d.type === "folder" && onOpenFolder(d.id)}
              className="flex w-full flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-accent/60"
              title={d.path}
            >
              <div className="relative flex items-center justify-center">
                {d.type === "folder" ? (
                  <Folder className="size-14 fill-accent text-highlight" strokeWidth={1.25} />
                ) : (
                  <FileText className="size-14 text-muted-foreground" strokeWidth={1.25} />
                )}
              </div>

              {/* Nome completo da pasta sem reticências */}
              <span className="w-full text-center font-mono text-xs break-words">{d.name}</span>
            </button>

            {/* Botão de Play no canto superior direito do card, visível em hover */}
            {hasExec && onRunDirectory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRunDirectory(d.id);
                }}
                title={`Executar: ${exec.config.name}`}
                className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-highlight text-highlight-foreground opacity-0 shadow-md transition-all duration-150 group-hover:opacity-100 hover:scale-115 active:scale-95"
              >
                <Play className="ml-0.5 size-3 fill-current" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DirectoryTree({ environmentId, parentId, onOpenFolder, onRunDirectory }: Props) {
  const { data } = useStore();
  const items = childrenOf(data, environmentId, parentId);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  if (!items.length) return <Empty />;

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentOrder = items.map((x) => x.id);
    const fromIdx = currentOrder.indexOf(draggedId);
    const toIdx = currentOrder.indexOf(targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
      currentOrder.splice(fromIdx, 1);
      currentOrder.splice(toIdx, 0, draggedId);
      reorderDirectories(currentOrder);
    }
  }

  function handleDragEnd() {
    setDraggedId(null);
  }

  return (
    <ul className="space-y-1 font-mono text-sm">
      {items.map((d) => {
        const exec = getExecution(data, environmentId, d.id);
        const hasExec = !!exec && exec.config.enabled && exec.actions.length > 0;
        const isDragging = draggedId === d.id;

        return (
          <li
            key={d.id}
            onDragOver={(e) => handleDragOver(e, d.id)}
            className={`group relative flex items-center rounded-md py-1 pr-3 pl-1 transition-all ${
              isDragging ? "opacity-40 bg-accent/40" : "hover:bg-accent/50"
            }`}
          >
            {/* Ícone de arrastar no hover à esquerda */}
            <div
              draggable
              onDragStart={() => handleDragStart(d.id)}
              onDragEnd={handleDragEnd}
              title="Arrastar para reordenar"
              className="mr-1 flex cursor-grab items-center opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            >
              <GripVertical className="size-4 text-muted-foreground" />
            </div>

            {d.type === "folder" ? (
              <button
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left hover:text-highlight"
                onClick={() => onOpenFolder(d.id)}
                title={d.path}
              >
                <Folder className="size-4 shrink-0 fill-accent text-highlight" />
                <span className="break-words">{d.name}/</span>
              </button>
            ) : (
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-muted-foreground" title={d.path}>
                <FileText className="size-4 shrink-0" />
                <span className="break-words">{d.name}</span>
              </span>
            )}

            {/* Botão de Play na extrema direita em hover */}
            {hasExec && onRunDirectory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRunDirectory(d.id);
                }}
                title={`Executar: ${exec.config.name}`}
                className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-foreground opacity-0 shadow-sm transition-all duration-150 group-hover:opacity-100 hover:scale-110 active:scale-95"
              >
                <Play className="ml-0.5 size-3 fill-current" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Empty() {
  return (
    <div className="rounded-xl border-[1.5px] border-dashed p-10 text-center text-sm text-muted-foreground">
      Nada aqui ainda. Use <strong>Criar pasta</strong> ou <strong>+ Opções → Adicionar diretório</strong>.
    </div>
  );
}
