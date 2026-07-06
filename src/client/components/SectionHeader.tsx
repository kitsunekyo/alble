import type { ReactNode } from "react";
import { cn } from "@/client/lib/utils";

export function SectionHeader({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "divide-y rounded-xl bg-card shadow-lg",
        className
      )}
    >
      <h1 className="p-4 text-sm font-semibold">{title}</h1>
      {children && <div className="flex items-center px-4 py-2">{children}</div>}
    </header>
  );
}