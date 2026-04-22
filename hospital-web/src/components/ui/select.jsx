import { clsx } from "clsx"
import * as React from "react"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

const SelectContext = React.createContext(null)

const Select = ({ children, value, onValueChange }) => {
    const [open, setOpen] = React.useState(false)
    const rootRef = React.useRef(null)

    React.useEffect(() => {
        if (!open) return
        const onPointerDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('pointerdown', onPointerDown, true)
        return () => document.removeEventListener('pointerdown', onPointerDown, true)
    }, [open])

    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div ref={rootRef} className="relative">
                {children}
            </div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext)

    return (
        <button
            type="button"
            ref={ref}
            onClick={() => setOpen(!open)}
            className={cn(
                "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm ring-offset-background transition-colors hover:border-indigo-200 hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {children}
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef(({ className, placeholder, ...props }, ref) => {
    const { value } = React.useContext(SelectContext)
    return (
        <span
            ref={ref}
            className={cn("block truncate", className)}
            {...props}
        >
            {value || placeholder}
        </span>
    )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
    const { open } = React.useContext(SelectContext)

    if (!open) return null

    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-[200] mt-1.5 w-full min-w-[12rem] overflow-hidden rounded-xl border border-indigo-100/90 bg-white py-1.5 text-gray-950 shadow-lg shadow-indigo-900/10 ring-1 ring-black/5",
                className
            )}
            {...props}
        >
            <div className="max-h-64 overflow-y-auto px-1">{children}</div>
        </div>
    )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
    const { onValueChange, setOpen, value: selectedValue } = React.useContext(SelectContext)
    const isSelected =
        selectedValue != null && selectedValue !== '' && String(selectedValue) === String(value)

    return (
        <div
            ref={ref}
            role="option"
            aria-selected={isSelected}
            className={cn(
                "mx-0.5 flex cursor-pointer select-text items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-sm outline-none transition-colors",
                isSelected
                    ? "bg-indigo-50 text-indigo-950 ring-1 ring-indigo-200/70"
                    : "text-gray-800 hover:bg-slate-50",
                className
            )}
            onClick={() => {
                onValueChange(value)
                setOpen(false)
            }}
            {...props}
        >
            <span
                className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold leading-none',
                    isSelected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent'
                )}
                aria-hidden
            >
                {isSelected ? '✓' : ''}
            </span>
            <div className="min-w-0 flex-1 leading-snug">{children}</div>
        </div>
    )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }

