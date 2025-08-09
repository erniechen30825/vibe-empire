import * as React from "react"
import { cn } from "@/lib/utils"

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink/10 bg-white/90 shadow-sm backdrop-blur",
        className
      )}
      {...props}
    />
  )
}
export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-0", props.className)} {...props} />
}
export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", props.className)} {...props} />
}
export function CardFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", props.className)} {...props} />
}
