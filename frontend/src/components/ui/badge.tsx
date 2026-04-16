import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        default: "border-[color:var(--status-info)]/40 bg-[color:var(--status-info)]/15 text-[color:var(--status-info)]",
        success: "border-[color:var(--status-healthy)]/40 bg-[color:var(--status-healthy)]/15 text-[color:var(--status-healthy)]",
        warning: "border-[color:var(--status-warning)]/40 bg-[color:var(--status-warning)]/15 text-[color:var(--status-warning)]",
        critical: "border-[color:var(--status-critical)]/40 bg-[color:var(--status-critical)]/15 text-[color:var(--status-critical)]",
        muted: "border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] text-[color:var(--text-secondary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
