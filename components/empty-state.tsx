export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border bg-white p-6 text-center">
      <div className="text-sm font-medium">{title}</div>
      {description ? <div className="text-xs text-muted-foreground mt-1">{description}</div> : null}
    </div>
  )
}
