import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-ink placeholder:text-ink/50",
        "focus:outline-none focus:ring-2 focus:ring-brand/40"
        , className
      )}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
