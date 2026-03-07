import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative h-4 w-full overflow-hidden rounded-full bg-gray-100",
            className
        )}
        {...props}
    >
        <div
            className="h-full w-full flex-1 bg-blue-600 transition-all"
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
    </div>
))
Progress.displayName = "Progress"

export { Progress }
