import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none",
      className
    )}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export { Textarea }
