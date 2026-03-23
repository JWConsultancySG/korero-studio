"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** When true, starts expanded (default true). */
  defaultOpen?: boolean;
  children: React.ReactNode;
};

/** Short, collapsible help for admin screens — keeps dense dashboards learnable without blocking work. */
export function AdminTutorialCallout({ title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-transparent px-4 py-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex items-center gap-2 font-black text-sm text-foreground">
            <BookOpen className="w-4 h-4 text-primary shrink-0" aria-hidden />
            {title}
          </span>
          <ChevronDown
            className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 text-sm text-muted-foreground leading-relaxed space-y-2 [&_strong]:text-foreground [&_strong]:font-bold">
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
