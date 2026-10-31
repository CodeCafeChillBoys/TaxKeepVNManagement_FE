import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, leftIcon, rightIcon, ...props }, ref) => {
  if (leftIcon || rightIcon) {
    return (
      <div className="relative rounded-lg shadow-xs w-full">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "block h-9 w-full rounded-lg border border-stone-300 bg-white py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 transition-all",
            leftIcon ? "pl-10" : "pl-3",
            rightIcon ? "pr-10" : "pr-3",
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-stone-400">
            {rightIcon}
          </div>
        )}
      </div>
    )
  }

  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
