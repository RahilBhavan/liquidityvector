import * as React from "react"
import { cn } from "@/lib/utils"

interface StampCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "orange" | "blue"
    sawtooth?: boolean
}

const StampCard = React.forwardRef<HTMLDivElement, StampCardProps>(
    ({ className, variant = "default", sawtooth = true, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative p-6 transition-all duration-200",
                    "border-2 border-sumi-black shadow-none",
                    sawtooth && "stamp-edge",
                    // Variants applying internal coloring, but sawtooth mask handles the shape
                    variant === "default" && "bg-white text-sumi-black",
                    variant === "orange" && "bg-intl-orange text-white",
                    variant === "blue" && "bg-cobalt-blue text-white",
                    className
                )}
                {...props}
            >
                {/* Optional decorative content could go here */}
                {children}
            </div>
        )
    }
)
StampCard.displayName = "StampCard"

export { StampCard }
