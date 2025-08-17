"use client"

import type React from "react"

import { useMemo } from "react"
import { DM_Serif_Display, Inter } from "next/font/google"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Star, CheckCircle2, Target, Sparkles, Info } from "lucide-react"

export const dynamic = "force-dynamic"

type MissionType = "highlight" | "habit" | "extra"

type Mission = {
  id: string
  user_id: string
  cycle_id: string | null
  task_id: string | null
  habit_plan_id: string | null
  mission_date: string
  type: MissionType
  is_highlight: boolean | null
  points: number | null
  is_completed: boolean | null
  completed_at: string | null
  created_at: string
}

const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

function formatLocalYMD(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function tintClasses(type: MissionType) {
  switch (type) {
    case "highlight":
      return {
        bgSoft: "bg-amber-100/80",
        bgSofter: "bg-amber-200/70",
        fg: "text-amber-900",
        chip: "bg-amber-200 text-amber-900",
        button: "bg-amber-700 hover:bg-amber-800 text-white",
        ring: "ring-amber-400",
        subtle: "text-amber-800",
      }
    case "habit":
      return {
        bgSoft: "bg-emerald-100/80",
        bgSofter: "bg-emerald-200/70",
        fg: "text-emerald-900",
        chip: "bg-emerald-200 text-emerald-900",
        button: "bg-emerald-700 hover:bg-emerald-800 text-white",
        ring: "ring-emerald-400",
        subtle: "text-emerald-800",
      }
    case "extra":
      return {
        bgSoft: "bg-indigo-100/80",
        bgSofter: "bg-indigo-200/70",
        fg: "text-indigo-900",
        chip: "bg-indigo-200 text-indigo-900",
        button: "bg-indigo-700 hover:bg-indigo-800 text-white",
        ring: "ring-indigo-400",
        subtle: "text-indigo-800",
      }
  }
}

export default function MissionsPage() {
  const today = useMemo(() => formatLocalYMD(), [])
  return (
    <main
      className={cn(`${inter.variable} ${dmSerif.variable}`, "min-h-dvh bg-gradient-to-b from-emerald-100/60 to-white")}
    >
      <div className="container mx-auto px-4 py-6 md:py-10">
        <Header today={today} />
        <MissionsDashboard today={today} />
      </div>
    </main>
  )
}

function Header({ today }: { today: string }) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-emerald-200 text-emerald-800 shadow-sm">
            <Target className="size-5" />
          </div>
          <h1 className={cn("text-2xl sm:text-3xl tracking-tight", "font-serif", dmSerif.className)}>
            {"Today's Missions"}
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">{today}</div>
      </div>
    </div>
  )
}

function MissionsDashboard({ today }: { today: string }) {
  const supabase = getSupabaseBrowser()
  const { toast } = useToast()
  const qc = useQueryClient()

  const missionsQuery = useQuery({
    queryKey: ["missions", today],
    queryFn: async (): Promise<Mission[]> => {
      const { data, error } = await supabase
        .from("missions")
        .select(
          "id,user_id,cycle_id,task_id,habit_plan_id,mission_date,type,is_highlight,points,is_completed,completed_at,created_at",
        )
        .eq("mission_date", today)
        .order("is_highlight", { ascending: false })
        .order("is_completed", { ascending: true })
        .order("type", { ascending: true })
      if (error) throw error
      return (data as Mission[]) ?? []
    },
    // Explicitly disable suspense to manage skeleton/error inline
    suspense: false,
    staleTime: 15_000,
  })

  const completeMission = useMutation({
    mutationFn: async (mission: Mission) => {
      if (mission.is_completed) return // no-op
      const now = new Date().toISOString()
      const { error: upErr } = await supabase
        .from("missions")
        .update({ is_completed: true, completed_at: now })
        .eq("id", mission.id)
      if (upErr) throw upErr

      const pts = mission.points ?? 0
      const { error: insErr } = await supabase.from("points_ledger").insert({
        user_id: mission.user_id,
        mission_id: mission.id,
        points: pts,
        reason: "mission_completed",
        // occurred_at defaults to now()
      } as any)
      if (insErr) throw insErr
    },
    onMutate: async (mission) => {
      await qc.cancelQueries({ queryKey: ["missions", today] })
      const prev = qc.getQueryData<Mission[]>(["missions", today])
      const nowISO = new Date().toISOString()
      if (prev) {
        qc.setQueryData<Mission[]>(
          ["missions", today],
          prev.map((m) => (m.id === mission.id ? { ...m, is_completed: true, completed_at: nowISO } : m)),
        )
      }
      return { prev }
    },
    onError: (err: any, _mission, ctx) => {
      if (ctx?.prev) qc.setQueryData(["missions", today], ctx.prev)
      toast({
        title: "Something went wrong",
        description: err?.message ?? "Failed to complete mission.",
        variant: "destructive",
      })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["missions", today] })
      qc.invalidateQueries({ queryKey: ["user_points"] })
      qc.invalidateQueries({ queryKey: ["empire_levels"] })
    },
  })

  const suggestHighlight = useMutation({
    mutationFn: async (missionId: string) => {
      const { error } = await supabase.from("missions").update({ is_highlight: true }).eq("id", missionId)
      if (error) throw error
    },
    onMutate: async (missionId) => {
      await qc.cancelQueries({ queryKey: ["missions", today] })
      const prev = qc.getQueryData<Mission[]>(["missions", today])
      if (prev) {
        qc.setQueryData<Mission[]>(
          ["missions", today],
          prev.map((m) => (m.id === missionId ? { ...m, is_highlight: true, type: m.type } : m)),
        )
      }
      return { prev }
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["missions", today], ctx.prev)
      const code = err?.code || err?.details || ""
      const constraintMsg =
        typeof code === "string" && code.includes("23505")
          ? "A highlight already exists for today. You can only have one."
          : "Could not set a highlight. Please try again."
      toast({
        title: "Cannot set highlight",
        description: constraintMsg,
        variant: "destructive",
      })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["missions", today] })
    },
  })

  const isLoading = missionsQuery.isLoading
  const isError = missionsQuery.isError
  const missions = missionsQuery.data ?? []

  const highlight = missions.find((m) => m.is_highlight || m.type === "highlight") ?? null
  const habits = missions.filter((m) => m.type === "habit")
  const extras = missions.filter((m) => m.type === "extra")

  const highlightCompleted = !!highlight?.is_completed

  const pickAnyIncomplete = () => missions.find((m) => !m.is_completed && !m.is_highlight)

  if (isLoading) {
    return (
      <div className="grid gap-6 md:gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Highlight of the Day</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Habit Missions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Extra Missions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorCard
        title="Failed to load missions"
        description="Please check your connection and try again."
        onRetry={() => missionsQuery.refetch()}
      />
    )
  }

  return (
    <div className="grid gap-6 md:gap-8">
      {/* Section 1: Highlight */}
      <section aria-label="Highlight of the Day">
        <MissionCard
          title="Highlight of the Day"
          icon={<Star className="size-5" />}
          tint="highlight"
          completed={!!highlight?.is_completed}
          actionLabel={highlight?.is_completed ? "Completed" : "Complete"}
          actionDisabled={!highlight || !!highlight.is_completed}
          points={highlight?.points ?? 0}
          onAction={() => highlight && completeMission.mutate(highlight)}
          isLoading={completeMission.isPending}
        >
          {highlight ? (
            <div className="text-sm text-muted-foreground">
              Choose one focus that makes today a win. Mark it complete when done.
            </div>
          ) : (
            <EmptyInline
              message="No highlight yet for today."
              ctaLabel="Suggest one"
              onCta={() => {
                const candidate = pickAnyIncomplete()
                if (!candidate) {
                  return toast({
                    title: "No missions to choose from",
                    description: "Add or schedule a mission for today to set as a highlight.",
                  })
                }
                suggestHighlight.mutate(candidate.id)
              }}
              loading={suggestHighlight.isPending}
            />
          )}
        </MissionCard>
      </section>

      <Separator />

      {/* Section 2: Habits */}
      <section aria-label="Habit Missions">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-200 text-emerald-800">
                <CheckCircle2 className="size-5" />
              </div>
              <CardTitle className="text-lg font-semibold">Habit Missions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {habits.length === 0 ? (
              <EmptyCard
                title="No habit missions yet"
                description="Habit missions will appear here. Keep it steady and consistent."
                tint="habit"
              />
            ) : (
              <ul className="grid gap-2">
                {habits.map((m) => (
                  <li key={m.id}>
                    <MissionRow mission={m} onComplete={() => completeMission.mutate(m)} disabled={!!m.is_completed} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Section 3: Extras (locked until highlight complete) */}
      <section aria-label="Extra Missions">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex size-9 items-center justify-center rounded-xl bg-indigo-200 text-indigo-800">
                <Sparkles className="size-5" />
              </div>
              <CardTitle className="text-lg font-semibold">Extra Missions</CardTitle>
            </div>
            {!highlightCompleted && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs text-indigo-800">
                <Info className="size-4" />
                Unlock by finishing Highlight
              </div>
            )}
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {extras.length === 0 ? (
              <EmptyCard
                title="No extras yet"
                description="Optional extra missions show here. Finish your Highlight to unlock."
                tint="extra"
              />
            ) : (
              <ul className="grid gap-2">
                {extras.map((m) => (
                  <li key={m.id}>
                    <MissionRow
                      mission={m}
                      onComplete={() => completeMission.mutate(m)}
                      disabled={!highlightCompleted || !!m.is_completed}
                      lockReason={!highlightCompleted ? "Unlock by finishing Highlight" : undefined}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function MissionCard({
  title,
  icon,
  tint,
  completed,
  actionLabel,
  actionDisabled,
  onAction,
  isLoading,
  points,
  children,
}: {
  title: string
  icon: React.ReactNode
  tint: MissionType
  completed?: boolean
  actionLabel: string
  actionDisabled?: boolean
  onAction?: () => void
  isLoading?: boolean
  points?: number
  children?: React.ReactNode
}) {
  const t = tintClasses(tint)
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("inline-flex size-9 items-center justify-center rounded-xl", t.bgSofter, t.fg)}>
              {icon}
            </div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </div>
          <Badge className={cn("rounded-full", t.chip)}>+{points ?? 0} pts</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className={cn("rounded-2xl border p-4", t.bgSoft)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              {children}
              {completed && <div className={cn("mt-1 text-xs", t.subtle)}>Great job. Keep the momentum.</div>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                className={cn("rounded-full", t.button)}
                disabled={actionDisabled || isLoading}
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MissionRow({
  mission,
  onComplete,
  disabled,
  lockReason,
}: {
  mission: Mission
  onComplete: () => void
  disabled?: boolean
  lockReason?: string
}) {
  const t = tintClasses(mission.type)
  const isDone = !!mission.is_completed
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition",
        "hover:shadow-sm",
        isDone ? "opacity-70" : "",
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={cn("inline-flex size-8 items-center justify-center rounded-lg", t.bgSofter, t.fg)}>
          {mission.type === "habit" ? <CheckCircle2 className="size-4" /> : <Sparkles className="size-4" />}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Badge className={cn("rounded-full", t.chip)}>{mission.type}</Badge>
            <span className="text-xs text-muted-foreground">+{mission.points ?? 0} pts</span>
          </div>
          <div className="mt-0.5 text-sm">{mission.type === "habit" ? "Habit mission" : "Extra mission"}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox checked={isDone} disabled className="hidden sm:inline-flex" aria-label="Completed state" />
        <Button
          className={cn("rounded-full", t.button)}
          disabled={disabled}
          onClick={onComplete}
          title={disabled && lockReason ? lockReason : undefined}
          aria-disabled={disabled}
        >
          {isDone ? "Completed" : "Complete"}
        </Button>
      </div>
    </div>
  )
}

function EmptyCard({ title, description, tint }: { title: string; description?: string; tint: MissionType }) {
  const t = tintClasses(tint)
  return (
    <div className={cn("rounded-2xl border p-6 text-center shadow-sm", t.bgSoft)}>
      <div className="text-sm font-medium">{title}</div>
      {description ? <div className="mt-1 text-xs text-muted-foreground">{description}</div> : null}
    </div>
  )
}

function EmptyInline({
  message,
  ctaLabel,
  onCta,
  loading,
}: {
  message: string
  ctaLabel: string
  onCta: () => void
  loading?: boolean
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">{message}</div>
      <div>
        <Button className="rounded-full bg-amber-700 hover:bg-amber-800 text-white" onClick={onCta} disabled={loading}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  )
}

function ErrorCard({
  title,
  description,
  onRetry,
}: {
  title: string
  description?: string
  onRetry: () => void
}) {
  return (
    <Card className="rounded-2xl shadow-sm border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">{description}</div>
        <Button variant="destructive" className="rounded-full" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}
