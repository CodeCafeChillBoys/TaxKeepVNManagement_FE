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
            "block w-full rounded-lg border border-stone-300 bg-white py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 transition-all",
            leftIcon ? "pl-11" : "pl-4",
            rightIcon ? "pr-11" : "pr-4",
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
        "flex h-11 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
