import type { ReactNode } from "react";
import { PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/** Right-hand actions panel; becomes a slide-over sheet on small screens. */
export function SidePanel({ children }: { children: ReactNode }) {
  return (
    <>
      <aside className="panel hidden w-80 shrink-0 flex-col gap-4 p-5 lg:flex">{children}</aside>
      <div className="fixed right-4 bottom-4 z-40 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="highlight" size="lg" className="rounded-full px-5 shadow-lg">
              <PanelRight /> Opções
            </Button>
          </SheetTrigger>
          <SheetContent className="flex w-80 flex-col gap-4 overflow-y-auto bg-card p-5 pt-10">
            <SheetTitle className="sr-only">Opções</SheetTitle>
            {children}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
