import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export function EnvironmentIcon({ src, name, className }: { src: string | null; name: string; className?: string }) {
  return (
    <div className={cn("flex size-16 items-center justify-center overflow-hidden rounded-xl bg-muted", className)}>
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <Boxes className="size-8 text-muted-foreground" strokeWidth={1.5} />
      )}
    </div>
  );
}
