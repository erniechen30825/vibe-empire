import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toastVariants = cva(
  "relative flex w-full items-center space-x-4 rounded-md border p-4 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "bg-white text-ink border-ink/10",
        destructive: "bg-red-600 text-white border-red-700",
        success: "bg-mint text-ink border-mint/40",
        info: "bg-brand text-ink border-brand/40",
        warning: "bg-sand text-ink border-sand/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string
  description?: string
}

export function Toast({ title, description, variant, className, ...props }: ToastProps) {
  return (
    <div className={cn(toastVariants({ variant }), className)} {...props}>
      <div className="flex flex-col">
        {title && <div className="font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
    </div>
  )
}
