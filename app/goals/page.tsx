"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { MoreVertical, Target, CheckCircle2 } from "lucide-react"
import GoalForm from "@/components/goals/goal-form"
import { useRequireAuth } from "@/hooks/use-require-auth"

type Goal = {
  id: string
  user_id: string
  category_id: string
  title: string
  description: string | null
  type: "progressive" | "habitual"
  importance: number | null
  effort_estimate_hours: number | null
  status: "active" | "completed"
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
  const { user, loading: authLoading } = useRequireAuth()

  const [openForm, setOpenForm] = useState(false)
  const [editGoalId, setEditGoalId] = useState<string | null>(null)

  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: async (): Promise<Goal[]> => {
      if (typeof window === "undefined") return []
      const { data, error } = await supabase
        .from("goals")
        .select(
          "id,user_id,category_id,title,description,type,importance,effort_estimate_hours,status,created_at,updated_at",
        )
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data as Goal[]) ?? []
    },
    enabled: !!user && typeof window !== "undefined",
  })

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      if (typeof window === "undefined") return []
      const { data, error } = await supabase
        .from("categories")
        .select("id,user_id,name,parent_id")
        .order("name", { ascending: true })
      if (error) throw error
      return (data as Category[]) ?? []
    },
    enabled: !!user && typeof window !== "undefined",
  })

  const markCompleted = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from("goals")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", goalId)
      if (error) throw error

      // Optional: write to points_ledger (stub)
      // const { data: session } = await supabase.auth.getSession()
      // if (session?.user) {
      //   await supabase.from("points_ledger").insert({
      //     user_id: session.user.id,
      //     points: 50,
      //     reason: "goal_completed"
      //   })
      // }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] })
      toast.success("Goal marked as completed!")
    },
    onError: (err: any) => {
      toast.error("Failed to mark goal completed", {
        description: err?.message ?? "Please try again.",
      })
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

  if (authLoading) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-emerald-50/50 to-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-ink">Goals</h1>
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
          <Separator className="my-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-1/3" />
                  <Skeleton className="mt-5 h-10 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-emerald-50/50 to-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand/20 text-brand">
              <Target className="size-5" />
            </div>
            <h1 className="text-2xl font-semibold text-ink">Goals</h1>
          </div>
          <Button
            className="rounded-full bg-mint text-ink hover:bg-mint/80 focus-visible:ring-mint/40"
            onClick={onCreate}
          >
            New Goal
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goalsQuery.isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Card key={i} className="rounded-2xl">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="mt-3 h-4 w-1/3" />
                    <Skeleton className="mt-5 h-10 w-28" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : goalsQuery.data && goalsQuery.data.length > 0 ? (
            goalsQuery.data.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                categoryPath={getCategoryPath(goal.category_id)}
                onEdit={() => onEdit(goal.id)}
                onMarkCompleted={() => markCompleted.mutate(goal.id)}
              />
            ))
          ) : (
            <Card className="rounded-2xl col-span-full">
              <CardHeader>
                <CardTitle className="text-ink">No goals yet</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-ink/70">
                Create your first goal to start tracking progress and building habits.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-ink">{editGoalId ? "Edit Goal" : "New Goal"}</DialogTitle>
          </DialogHeader>
          <GoalForm
            mode={editGoalId ? "edit" : "create"}
            goalId={editGoalId ?? undefined}
            onClose={() => {
              setOpenForm(false)
              setEditGoalId(null)
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
      if (typeof window === "undefined") return []
      const { data, error } = await supabase
        .from("milestones")
        .select("id,title,target_date,order_index,is_completed")
        .eq("goal_id", goal.id)
        .order("order_index", { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: goal.type === "progressive" && typeof window !== "undefined",
  })

  // Habitual: habit plan
  const { data: habitPlan } = useQuery({
    queryKey: ["habit_plans", goal.id],
    queryFn: async () => {
      if (typeof window === "undefined") return null
      const { data, error } = await supabase
        .from("habit_plans")
        .select("id,frequency,times_per_week")
        .eq("goal_id", goal.id)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
    enabled: goal.type === "habitual" && typeof window !== "undefined",
  })

  const typeBadge =
    goal.type === "progressive" ? (
      <Badge className="rounded-full bg-brand/20 text-brand hover:bg-brand/30">progressive</Badge>
    ) : (
      <Badge className="rounded-full bg-mint/60 text-ink hover:bg-mint/80">habitual</Badge>
    )

  const statusBadge =
    goal.status === "completed" ? (
      <Badge className="rounded-full bg-mint/60 text-ink">
        <CheckCircle2 className="mr-1 size-3" />
        completed
      </Badge>
    ) : (
      <Badge variant="outline" className="rounded-full border-brand/40 text-brand">
        active
      </Badge>
    )

  const importance = goal.importance ?? 3

  let secondary: string | null = null
  if (goal.type === "progressive") {
    const total = milestones?.length ?? 0
    const completed = (milestones ?? []).filter((m: any) => m.is_completed === true).length
    secondary = `${completed}/${total} milestones`
  } else if (goal.type === "habitual" && habitPlan) {
    const hp: any = habitPlan
    if (hp.frequency === "daily") {
      secondary = "Daily"
    } else if (hp.frequency === "weekly") {
      secondary = "Weekly"
    } else if (hp.frequency === "times_per_week") {
      secondary = `${hp.times_per_week ?? 1}×/week`
    }
  }

  // Safely handle description - ensure it's always a string
  const safeDescription =
    typeof goal.description === "string" ? goal.description : goal.description ? String(goal.description) : null

  return (
    <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg font-semibold text-ink truncate">{String(goal.title)}</CardTitle>
              {typeBadge}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="rounded-full bg-sand/60 text-ink text-xs">
                Importance {importance}
              </Badge>
              {statusBadge}
            </div>
            <div className="mt-1 text-xs text-ink/70">{String(categoryPath)}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                <MoreVertical className="size-4" />
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
        {safeDescription && <div className="text-sm text-ink/80 mb-3 line-clamp-2">{safeDescription}</div>}
        {secondary && <div className="text-xs text-ink/70 font-medium">{secondary}</div>}
        {goal.effort_estimate_hours && (
          <div className="text-xs text-ink/70 mt-1">Est. {goal.effort_estimate_hours}h effort</div>
        )}
      </CardContent>
    </Card>
  )
}
