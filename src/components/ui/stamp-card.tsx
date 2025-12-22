import * as React from "react"
import { cn } from "@/lib/utils"

interface StampCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "orange" | "blue"
    sawtooth?: boolean
}

const StampCard = React.forwardRef<HTMLDivElement, StampCardProps>(
    ({ className, variant = "default", sawtooth = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative p-6 transition-all duration-200",
                    "border-2 border-sumi-black rounded-[var(--radius)]",
                    sawtooth && "stamp-edge",
                    variant === "default" && "bg-white text-sumi-black",
                    variant === "orange" && "bg-intl-orange text-white",
                    variant === "blue" && "bg-cobalt-blue text-white",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
StampCard.displayName = "StampCard"

export { StampCard }
