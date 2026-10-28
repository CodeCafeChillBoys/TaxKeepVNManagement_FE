import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/8 text-primary",
        secondary: "border-outline-variant/50 bg-surface-container-low text-on-surface",
        outline: "border-outline-variant/60 bg-transparent text-on-surface-variant",
        success: "border-outline-variant/60 bg-surface-container-lowest text-on-surface",
        warning: "border-outline-variant/60 bg-surface-container-low text-on-surface",
        orange: "border-outline-variant/60 bg-surface-container-low text-on-surface",
        destructive: "border-red-200/80 bg-red-50/50 text-red-700",
        muted: "border-outline-variant/40 bg-surface-container-low/60 text-on-surface-variant",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }
