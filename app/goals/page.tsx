"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { MoreVertical } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import GoalForm from "@/components/goals/goal-form"

export const dynamic = "force-dynamic"

type Goal = {
  id: string
  user_id: string
  category_id: string
  title: string
  description: string | null
  type: "progressive" | "habitual"
  importance: number | null
  effort_estimate_hours: number | null
  status: "active" | "completed" | "archived" | string
  created_at: string
  updated_at: string
}

type Category = {
  id: string
  user_id: string
  name: string
  parent_id: string | null
}

export default function GoalsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const qc = useQueryClient()

  const [authChecking, setAuthChecking] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [editGoalId, setEditGoalId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (!data.session) {
        router.push("/login")
      } else {
        setAuthChecking(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [router, supabase])

  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from("goals")
        .select(
          "id,user_id,category_id,title,description,type,importance,effort_estimate_hours,status,created_at,updated_at",
        )
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data as Goal[]) ?? []
    },
    enabled: !authChecking,
  })

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,user_id,name,parent_id")
        .order("name", { ascending: true })
      if (error) throw error
      return (data as Category[]) ?? []
    },
    enabled: !authChecking,
  })

  const markCompleted = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from("goals").update({ status: "completed" }).eq("id", goalId)
      if (error) throw error
      // Optional: write to points_ledger (stub)
      // await supabase.from("points_ledger").insert({ user_id: ..., points: 50, reason: "goal_completed" })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] })
      toast.success("Goal marked as completed")
    },
    onError: (err: any) => {
      toast.error("Failed to mark goal completed", { description: err?.message ?? "Please try again." })
    },
  })

  const onEdit = (goalId: string) => {
    setEditGoalId(goalId)
    setOpenForm(true)
  }

  const onCreate = () => {
    setEditGoalId(null)
    setOpenForm(true)
  }

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>()
    ;(categoriesQuery.data ?? []).forEach((c) => map.set(c.id, c))
    return map
  }, [categoriesQuery.data])

  const getCategoryPath = (categoryId: string) => {
    const child = categoriesById.get(categoryId)
    if (!child) return "Uncategorized"
    const parent = child.parent_id ? categoriesById.get(child.parent_id) : null
    return parent ? `${parent.name} ▸ ${child.name}` : child.name
  }

  if (authChecking) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-emerald-50/50 to-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-ink">Goals</h1>
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="mt-3 h-4 w-1/3" />
                <Skeleton className="mt-5 h-10 w-28" />
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="mt-3 h-4 w-1/3" />
                <Skeleton className="mt-5 h-10 w-28" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-emerald-50/50 to-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">Goals</h1>
          <Button className="rounded-full bg-mint text-ink hover:bg-mint/80" onClick={onCreate}>
            New Goal
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 md:grid-cols-2">
          {goalsQuery.isLoading ? (
            <>
              <Card className="rounded-2xl">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-1/3" />
                  <Skeleton className="mt-5 h-10 w-28" />
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-1/3" />
                  <Skeleton className="mt-5 h-10 w-28" />
                </CardContent>
              </Card>
            </>
          ) : goalsQuery.data && goalsQuery.data.length > 0 ? (
            goalsQuery.data
              // Optionally hide archived if present in schema
              .filter((g) => g.status === "active" || g.status === "completed")
              .map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  categoryPath={getCategoryPath(g.category_id)}
                  onEdit={() => onEdit(g.id)}
                  onMarkCompleted={() => markCompleted.mutate(g.id)}
                />
              ))
          ) : (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>No goals yet</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-ink/70">
                Create your first goal to start tracking progress and habits.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editGoalId ? "Edit Goal" : "New Goal"}</DialogTitle>
          </DialogHeader>
          <GoalForm
            mode={editGoalId ? "edit" : "create"}
            goalId={editGoalId ?? undefined}
            onClose={() => {
              setOpenForm(false)
              setEditGoalId(null)
              qc.invalidateQueries({ queryKey: ["goals"] })
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  )
}

function GoalCard({
  goal,
  categoryPath,
  onEdit,
  onMarkCompleted,
}: {
  goal: Goal
  categoryPath: string
  onEdit: () => void
  onMarkCompleted: () => void
}) {
  const supabase = getSupabaseBrowser()

  // Progressive: milestones counts
  const { data: milestones } = useQuery({
    queryKey: ["milestones", goal.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("goal_id", goal.id)
        .order("order_index", {
          ascending: true,
        })
      if (error) throw error
      return data ?? []
    },
    enabled: goal.type === "progressive",
  })

  // Habitual: habit plan
  const { data: habitPlan } = useQuery({
    queryKey: ["habit_plans", goal.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("habit_plans").select("*").eq("goal_id", goal.id).maybeSingle()
      if (error) throw error
      return data ?? null
    },
    enabled: goal.type === "habitual",
  })

  const typeBadge =
    goal.type === "progressive" ? (
      <Badge className="rounded-full bg-brand text-ink">progressive</Badge>
    ) : (
      <Badge className="rounded-full bg-mint text-ink">habitual</Badge>
    )

  const importance = goal.importance ?? 3

  let secondary: string | null = null
  if (goal.type === "progressive") {
    const total = milestones?.length ?? 0
    const completed = (milestones ?? []).filter((m: any) => m.is_completed === true).length
    secondary = `${completed}/${total} milestones`
  } else {
    // Support either new (frequency/times_per_week) or legacy (period/times_per_period) schema
    const p: any = habitPlan
    if (p?.frequency) {
      if (p.frequency === "times_per_week") {
        secondary = `${p.times_per_week ?? 0}×/week`
      } else if (p.frequency === "daily") {
        secondary = "daily"
      } else if (p.frequency === "weekly") {
        secondary = "weekly"
      }
    } else if (p?.period) {
      if (p.period === "day") {
        secondary = "daily"
      } else if (p.period === "week") {
        const n = p.times_per_period ?? 0
        secondary = n ? `${n}×/week` : "weekly"
      }
    }
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">{goal.title}</CardTitle>
              {typeBadge}
              <Badge variant="secondary" className="rounded-full bg-sand/60 text-ink">
                Importance {importance}
              </Badge>
              <Badge
                variant="outline"
                className={`rounded-full ${goal.status === "completed" ? "bg-mint/60 text-ink" : "bg-brand/20 text-ink"}`}
              >
                {goal.status}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-ink/70">{categoryPath}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onMarkCompleted} disabled={goal.status === "completed"}>
                Mark completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {goal.description ? <div className="text-sm text-ink/80">{goal.description}</div> : null}
        {secondary ? <div className="mt-2 text-xs text-ink/70">{secondary}</div> : null}
      </CardContent>
    </Card>
  )
}
