import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fileToSquareDataUrl } from "@/lib/id";
import { createEnvironment, deleteEnvironment, updateEnvironment } from "@/lib/store";
import type { Environment } from "@/lib/types";
import { EnvironmentIcon } from "./EnvironmentIcon";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  environment?: Environment | undefined;
}

/** Create a new environment, or edit name/image of an existing one. */
export function EnvironmentDialog({ open, onOpenChange, environment }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(environment?.name ?? "");
      setIcon(environment?.icon ?? null);
    }
  }, [open, environment]);

  async function onFile(f?: File) {
    if (!f) return;
    try {
      setIcon(await fileToSquareDataUrl(f));
    } catch {
      toast.error("Não foi possível ler a imagem.");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (environment) {
      updateEnvironment(environment.id, { name: n, icon });
      toast.success("Ambiente atualizado");
    } else {
      createEnvironment(n, icon);
      toast.success(`Ambiente "${n}" criado`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{environment ? "Editar ambiente" : "Criar ambiente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center gap-4">
            <EnvironmentIcon src={icon} name={name} />
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus /> {icon ? "Trocar imagem" : "Escolher imagem"}
              </Button>
              {icon && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setIcon(null)}>
                  <X /> Usar ícone padrão
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="env-name">Nome</Label>
            <Input id="env-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Desenvolvimento" />
            <p className="text-xs text-muted-foreground">Organiza seus projetos no app — não cria pastas no Windows.</p>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {environment ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`Excluir o ambiente "${environment.name}"? As listas continuam existindo.`)) {
                    deleteEnvironment(environment.id);
                    onOpenChange(false);
                  }
                }}
              >
                <Trash2 /> Excluir
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={!name.trim()}>
              {environment ? "Salvar" : "Criar ambiente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
