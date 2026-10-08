import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto">
    <table ref={ref} className={cn("w-full caption-bottom text-sm text-left", className)} {...props} />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-surface-container-low/50 [&_tr]:border-b [&_tr]:border-outline-variant/30", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-outline-variant/20", className)} {...props} />
))
TableBody.displayName = "TableBody"

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("transition-colors hover:bg-surface-container-low/40", className)} {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn("h-11 px-4 align-middle text-[11px] font-bold uppercase tracking-wider text-on-surface-variant", className)}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("px-4 py-3.5 align-middle", className)} {...props} />
))
TableCell.displayName = "TableCell"

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
