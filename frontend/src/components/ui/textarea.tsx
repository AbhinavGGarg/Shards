import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-ghost)] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[color:var(--status-info)]/50",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
