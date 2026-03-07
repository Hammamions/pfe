import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

const Switch = React.forwardRef(({ className, ...props }, ref) => (
    <div className="flex items-center">
        <input
            type="checkbox"
            className={cn(
                "peer h-[24px] w-[44px] appearance-none rounded-full bg-gray-200 transition-all checked:bg-blue-600 hover:bg-gray-300 checked:hover:bg-blue-700 cursor-pointer relative",
                "after:absolute after:top-[2px] after:left-[2px] after:h-[20px] after:w-[20px] after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-[20px]",
                className
            )}
            ref={ref}
            {...props}
        />
    </div>
))
Switch.displayName = "Switch"

export { Switch }
