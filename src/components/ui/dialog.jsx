import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Dialog theo API shadcn (open / onOpenChange), dựng bằng portal thuần
 * để không phát sinh thêm dependency @radix-ui/react-dialog.
 */
function Dialog({ open, onOpenChange, children }) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === "Escape" && onOpenChange?.(false)
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0"
        onClick={() => onOpenChange?.(false)}
      />
      <DialogContext.Provider value={{ onOpenChange }}>{children}</DialogContext.Provider>
    </div>,
    document.body
  )
}

const DialogContext = React.createContext({ onOpenChange: undefined })

const DialogContent = React.forwardRef(({ className, children, as: Comp = "div", ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext)
  return (
    <Comp
      ref={ref}
      role="dialog"
      aria-modal="true"
      className={cn(
        "relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 flex flex-col gap-4",
        className
      )}
      {...props}
    >
      {children}
      <button
        type="button"
        onClick={() => onOpenChange?.(false)}
        className="absolute right-4 top-4 rounded-md p-1 text-on-surface-variant opacity-70 hover:opacity-100 hover:bg-surface-container-low transition cursor-pointer"
        aria-label="Đóng"
      >
        <X className="h-4 w-4" />
      </button>
    </Comp>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col gap-1.5 pr-6", className)} {...props} />
)

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2", className)} {...props} />
)

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-bold leading-tight text-on-surface", className)} {...props} />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-on-surface-variant", className)} {...props} />
))
DialogDescription.displayName = "DialogDescription"

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
