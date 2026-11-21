import { useEffect, useState } from "react";
import { FolderSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDirectory } from "@/lib/store";
import type { Directory, TreeNode } from "@/lib/types";
import { pickWindowsFolder, scanWindowsDirectory, type ScannedDiskNode } from "@/lib/run-action.functions";

function convertDiskNodeToTreeNode(node: ScannedDiskNode): TreeNode {
  return {
    name: node.name,
    type: node.type,
    children: node.children?.map(convertDiskNodeToTreeNode) ?? [],
  };
}

export function AddDirectoryDialog({
  open,
  onOpenChange,
  environmentId,
  parentId = null,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  environmentId: string;
  parentId?: string | null;
}) {
  const [path, setPath] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (open) {
      setPath("");
      setScanning(false);
    }
  }, [open]);

  async function handlePickFolder() {
    try {
      const res = await pickWindowsFolder({ data: { title: "Selecione o diretório a adicionar" } });
      if (res && res.path) {
        setPath(res.path);
      }
    } catch {
      toast.error("Não foi possível abrir o seletor do Windows");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanPath = path.trim();
    if (!cleanPath) return;

    setScanning(true);
    try {
      // Escaneia a pasta no disco local usando a server function
      const scanRes = await scanWindowsDirectory({ data: { directoryPath: cleanPath } });

      if (!scanRes.ok) {
        toast.error(scanRes.error || "Erro ao escanear diretório");
        setScanning(false);
        return;
      }

      const folderName = scanRes.folderName;
      const childrenTree: TreeNode[] = (scanRes.children ?? []).map(convertDiskNodeToTreeNode);

      createDirectory({
        environmentId,
        parentId: parentId ?? null,
        name: folderName,
        path: cleanPath,
        type: "folder",
        children: childrenTree.length > 0 ? childrenTree : undefined,
      });

      const count = childrenTree.length;
      toast.success(`Pasta "${folderName}" adicionada com ${count} item(ns) importado(s)`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao importar diretório");
    } finally {
      setScanning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !scanning && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar diretório</DialogTitle>
          <DialogDescription>
            Informe o caminho da pasta no seu computador para importar a estrutura completa de arquivos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dir-path">Caminho no Windows</Label>
            <div className="flex gap-2">
              <Input
                id="dir-path"
                className="font-mono text-xs"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="C:\Projetos\meu-app"
                disabled={scanning}
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePickFolder}
                title="Procurar pasta no Windows..."
                disabled={scanning}
              >
                <FolderSearch className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Você pode digitar o caminho ou clicar na lupa para selecionar a pasta pelo Windows.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={scanning}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!path.trim() || scanning}>
              {scanning ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Importando...
                </>
              ) : (
                "Adicionar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  environmentId,
  parent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  environmentId: string;
  parent: Directory | null;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar pasta</DialogTitle>
          <DialogDescription>
            Cria uma pasta na estrutura do ambiente{parent ? ` dentro de "${parent.name}"` : ""}. Nenhuma pasta é criada no Windows.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            createDirectory({
              environmentId,
              parentId: parent?.id ?? null,
              name: n,
              path: parent ? `${parent.path}\\${n}` : n,
              type: "folder",
            });
            toast.success(`Pasta "${n}" criada`);
            onOpenChange(false);
          }}
        >
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="nova-pasta" />
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>Criar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenameFolderDialog({
  open,
  onOpenChange,
  directory,
  onRename,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  directory: Directory | null;
  onRename: (newName: string) => void;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open && directory) {
      setName(directory.name);
    }
  }, [open, directory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renomear pasta</DialogTitle>
          <DialogDescription>
            Altere o nome visual desta pasta no GenO.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n || n === directory?.name) {
              onOpenChange(false);
              return;
            }
            onRename(n);
            onOpenChange(false);
          }}
        >
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da pasta" />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
