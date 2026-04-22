import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
        default: "bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-400 text-white shadow-md shadow-indigo-500/25 hover:brightness-105 hover:shadow-lg hover:shadow-indigo-500/30",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-indigo-200/80 bg-white/90 hover:bg-indigo-50/80 text-indigo-950",
        secondary: "bg-indigo-50 text-indigo-900 hover:bg-indigo-100/90",
        ghost: "hover:bg-indigo-50/80 hover:text-indigo-900",
        link: "text-indigo-600 underline-offset-4 hover:text-indigo-700 hover:underline",
    }

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
    }

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                variants[variant],
                sizes[size],
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
Button.displayName = "Button"

export { Button }
