import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext({ value: undefined, onValueChange: undefined })

function Tabs({ value, onValueChange, className, ...props }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("flex flex-col gap-4", className)} {...props} />
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="tablist"
    className={cn("inline-flex w-full items-center gap-1 rounded-xl bg-surface-container-lowest p-1 shadow-sm", className)}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)
  const active = ctx.value === value
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={() => ctx.onValueChange?.(value)}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all cursor-pointer",
        active ? "bg-primary text-on-primary shadow-md" : "text-on-surface-variant hover:bg-surface-container-low",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

function TabsContent({ value, className, ...props }) {
  const ctx = React.useContext(TabsContext)
  if (ctx.value !== value) return null
  return <div role="tabpanel" className={cn("animate-in fade-in-0", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
