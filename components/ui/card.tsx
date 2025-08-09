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
export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-ink", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-ink/70", className)} {...props} />;
}
