import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-on-primary",
        secondary: "border-transparent bg-surface-container-low text-on-surface",
        outline: "border-outline-variant/50 text-on-surface-variant",
        success: "border-transparent bg-emerald-50 text-emerald-700",
        warning: "border-transparent bg-amber-50 text-amber-700",
        orange: "border-transparent bg-orange-50 text-orange-700",
        destructive: "border-transparent bg-red-50 text-red-600",
        muted: "border-transparent bg-gray-100 text-gray-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }
