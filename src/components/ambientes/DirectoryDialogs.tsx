import { useEffect, useState } from "react";
import { FolderOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDirectory } from "@/lib/store";
import type { Directory, TreeNode } from "@/lib/types";
import { fileSystem } from "@/services/filesystem";
import { SAMPLE_PROJECT_TREE } from "@/services/filesystem/mock-data";

function countNodes(t: TreeNode[]): number {
  return t.reduce((n, x) => n + 1 + countNodes(x.children ?? []), 0);
}

export function AddDirectoryDialog({
  open,
  onOpenChange,
  environmentId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  environmentId: string;
}) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [source, setSource] = useState<"picked" | "sample" | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setPath("");
      setTree(null);
      setSource(null);
    }
  }, [open]);

  async function pick() {
    const res = await fileSystem.pickDirectory();
    if (!res) return;
    setName(res.name);
    if (res.path) setPath(res.path);
    setTree(res.tree);
    setSource("picked");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createDirectory({
      environmentId,
      parentId: null,
      name: name.trim(),
      path: path.trim() || name.trim(),
      type: "folder",
      children: tree ?? undefined,
    });
    toast.success(`Diretório "${name.trim()}" adicionado`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar diretório</DialogTitle>
          <DialogDescription>Associe um diretório do seu computador a este ambiente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dir-name">Nome</Label>
            <Input id="dir-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="meu-app" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dir-path">Caminho no Windows</Label>
            <Input id="dir-path" className="font-mono" value={path} onChange={(e) => setPath(e.target.value)} placeholder="C:\Projetos\meu-app" />
            <p className="text-xs text-muted-foreground">
              O navegador não revela o caminho real da pasta; informe-o para uso futuro na versão desktop.
            </p>
          </div>
          <div className="space-y-2 rounded-xl border-[1.5px] border-dashed p-3">
            <p className="text-sm font-medium">Estrutura de arquivos</p>
            <div className="flex flex-wrap gap-2">
              {fileSystem.canPickDirectory() && (
                <Button type="button" variant="outline" size="sm" onClick={pick}>
                  <FolderOpen /> Ler pasta do computador
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTree(SAMPLE_PROJECT_TREE);
                  setSource("sample");
                  if (!name) setName("meu-app");
                }}
              >
                <Sparkles /> Usar estrutura de exemplo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {tree
                ? `${countNodes(tree)} itens ${source === "sample" ? "(simulados)" : "lidos da pasta selecionada"}.`
                : fileSystem.canPickDirectory()
                  ? "Opcional. A leitura é somente de nomes, feita pelo navegador."
                  : "Seu navegador não permite ler pastas. Use o exemplo ou adicione sem estrutura."}
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>Adicionar</Button>
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
