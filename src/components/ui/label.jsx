import * as React from "react"
import { cn } from "@/lib/utils"

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-xs font-bold uppercase tracking-wider text-stone-700 select-none",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }
