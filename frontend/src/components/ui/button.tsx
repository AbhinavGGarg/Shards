import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--status-info)]/60",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--status-info)] text-[#05101a] hover:brightness-110 shadow-[0_0_0_1px_rgba(42,216,255,0.4)]",
        secondary:
          "border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] text-[color:var(--text-primary)] hover:border-[color:var(--status-info)]/45",
        ghost: "text-[color:var(--text-secondary)] hover:bg-white/5 hover:text-[color:var(--text-primary)]",
        danger:
          "border border-[color:var(--status-critical)]/45 bg-[color:var(--status-critical)]/15 text-[color:var(--status-critical)] hover:bg-[color:var(--status-critical)]/22",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
