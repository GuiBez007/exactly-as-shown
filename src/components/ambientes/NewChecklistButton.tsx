import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createChecklist } from "@/lib/store";

export function NewChecklistButton({ environmentId }: { environmentId?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> Nova lista
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createChecklist(name.trim(), environmentId);
            setName("");
            setOpen(false);
          }}
        >
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Coisas para estudar" />
          <Button type="submit" size="sm" className="w-full" disabled={!name.trim()}>
            Criar lista
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
