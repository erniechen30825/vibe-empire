"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full min-h-[96px] rounded-xl border border-ink/20 bg-white px-3 py-2 text-ink placeholder:text-ink/50",
        "focus:outline-none focus:ring-2 focus:ring-brand/40",
        className
      )}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"
