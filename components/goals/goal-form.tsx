"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"

type Mode = "create" | "edit"

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

type MilestoneDraft = {
  id?: string
  title: string
  target_date: string
}

type HabitPlanDraft = {
  frequency: "daily" | "weekly" | "times_per_week"
  times_per_week?: number
}

export default function GoalForm({
  mode,
  goalId,
  onClose,
}: {
  mode: Mode
  goalId?: string
  onClose: () => void
}) {
  const supabase = getSupabaseBrowser()
  const qc = useQueryClient()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"progressive" | "habitual">("progressive")
  const [parentId, setParentId] = useState<string>("")
  const [childId, setChildId] = useState<string>("")
  const [importance, setImportance] = useState<number>(3)
  const [effortHours, setEffortHours] = useState<number | "">("")

  const [milestones, setMilestones] = useState<MilestoneDraft[]>([])
  const [habitPlan, setHabitPlan] = useState<HabitPlanDraft>({
    frequency: "daily",
    times_per_week: 3,
  })

  const [pending, setPending] = useState(false)

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from("categories").select("id,user_id,name,parent_id").order("name")
      if (error) throw error
      return (data as Category[]) ?? []
    },
  })

  const parents = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.parent_id === null),
    [categoriesQuery.data],
  )

  const children = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.parent_id === parentId),
    [categoriesQuery.data, parentId],
  )

  // Load existing data in edit mode
  const goalQuery = useQuery({
    queryKey: ["goals", goalId],
    queryFn: async (): Promise<Goal | null> => {
      if (!goalId) return null
      const { data, error } = await supabase.from("goals").select("*").eq("id", goalId).maybeSingle()
      if (error) throw error
      return (data as Goal) ?? null
    },
    enabled: mode === "edit" && !!goalId,
  })

  const milestonesQuery = useQuery({
    queryKey: ["milestones", goalId],
    queryFn: async () => {
      if (!goalId) return []
      const { data, error } = await supabase
        .from("milestones")
        .select("id,title,target_date,order_index")
        .eq("goal_id", goalId)
        .order("order_index", { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: mode === "edit" && !!goalId,
  })

  const habitPlanQuery = useQuery({
    queryKey: ["habit_plans", goalId],
    queryFn: async () => {
      if (!goalId) return null
      const { data, error } = await supabase.from("habit_plans").select("*").eq("goal_id", goalId).maybeSingle()
      if (error) throw error
      return data ?? null
    },
    enabled: mode === "edit" && !!goalId,
  })

  // Populate form when editing
  useEffect(() => {
    if (mode === "edit" && goalQuery.data) {
      const g = goalQuery.data
      setTitle(g.title ?? "")
      setDescription(g.description ?? "")
      setType(g.type)
      setImportance(g.importance ?? 3)
      setEffortHours(g.effort_estimate_hours ?? "")

      // Set category
      const all = categoriesQuery.data ?? []
      const child = all.find((c) => c.id === g.category_id)
      const parent = child?.parent_id ? all.find((c) => c.id === child.parent_id) : null
      setParentId(parent?.id ?? "")
      setChildId(child?.id ?? "")
    }
  }, [mode, goalQuery.data, categoriesQuery.data])

  useEffect(() => {
    if (mode === "edit" && milestonesQuery.data) {
      const ms = (milestonesQuery.data as any[]).map((m) => ({
        id: m.id,
        title: m.title ?? "",
        target_date: m.target_date ?? "",
      }))
      setMilestones(ms)
    }
  }, [mode, milestonesQuery.data])

  useEffect(() => {
    if (mode === "edit" && habitPlanQuery.data) {
      const hp: any = habitPlanQuery.data
      setHabitPlan({
        frequency: hp.frequency ?? "daily",
        times_per_week: hp.times_per_week ?? 3,
      })
    }
  }, [mode, habitPlanQuery.data])

  const resetChildCategory = (pid: string) => {
    setParentId(pid)
    setChildId("")
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !childId) {
        throw new Error("Title and Category are required")
      }

      const goalData = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        category_id: childId,
        importance,
        effort_estimate_hours: typeof effortHours === "number" ? effortHours : null,
        status: "active" as const,
      }

      if (mode === "create") {
        // Create goal
        const { data: created, error: gErr } = await supabase.from("goals").insert(goalData).select("id").single()
        if (gErr) throw gErr

        const newGoalId = created.id

        // Handle type-specific data
        if (type === "progressive" && milestones.length > 0) {
          const milestoneRows = milestones.map((m, idx) => ({
            goal_id: newGoalId,
            title: m.title,
            target_date: m.target_date || null,
            order_index: idx + 1,
            is_completed: false,
          }))
          const { error: mErr } = await supabase.from("milestones").insert(milestoneRows)
          if (mErr) throw mErr
        } else if (type === "habitual") {
          const { error: hErr } = await supabase.from("habit_plans").insert({
            goal_id: newGoalId,
            frequency: habitPlan.frequency,
            times_per_week: habitPlan.frequency === "times_per_week" ? habitPlan.times_per_week : null,
          })
          if (hErr) throw hErr
        }
      } else if (mode === "edit" && goalId) {
        // Update goal
        const { error: upErr } = await supabase
          .from("goals")
          .update({ ...goalData, updated_at: new Date().toISOString() })
          .eq("id", goalId)
        if (upErr) throw upErr

        // Sync type-specific data
        if (type === "progressive") {
          // Delete habit plan if switching types
          await supabase.from("habit_plans").delete().eq("goal_id", goalId)

          // Handle milestones
          const { data: existing } = await supabase.from("milestones").select("id").eq("goal_id", goalId)

          const existingIds = new Set((existing ?? []).map((m: any) => m.id))
          const keepIds = new Set(milestones.filter((m) => m.id).map((m) => m.id))

          // Delete removed milestones
          const toDelete = [...existingIds].filter((id) => !keepIds.has(id))
          if (toDelete.length > 0) {
            await supabase.from("milestones").delete().in("id", toDelete)
          }

          // Insert new milestones
          const newMilestones = milestones.filter((m) => !m.id)
          if (newMilestones.length > 0) {
            const rows = newMilestones.map((m, idx) => ({
              goal_id: goalId,
              title: m.title,
              target_date: m.target_date || null,
              order_index: milestones.indexOf(m) + 1,
              is_completed: false,
            }))
            await supabase.from("milestones").insert(rows)
          }

          // Update existing milestones
          for (let i = 0; i < milestones.length; i++) {
            const m = milestones[i]
            if (m.id) {
              await supabase
                .from("milestones")
                .update({
                  title: m.title,
                  target_date: m.target_date || null,
                  order_index: i + 1,
                })
                .eq("id", m.id)
            }
          }
        } else if (type === "habitual") {
          // Delete milestones if switching types
          await supabase.from("milestones").delete().eq("goal_id", goalId)

          // Upsert habit plan
          const { data: existing } = await supabase.from("habit_plans").select("id").eq("goal_id", goalId).maybeSingle()

          const habitData = {
            goal_id: goalId,
            frequency: habitPlan.frequency,
            times_per_week: habitPlan.frequency === "times_per_week" ? habitPlan.times_per_week : null,
          }

          if (existing?.id) {
            await supabase.from("habit_plans").update(habitData).eq("goal_id", goalId)
          } else {
            await supabase.from("habit_plans").insert(habitData)
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] })
      qc.invalidateQueries({ queryKey: ["milestones", goalId] })
      qc.invalidateQueries({ queryKey: ["habit_plans", goalId] })
      toast.success(mode === "create" ? "Goal created!" : "Goal updated!")
      onClose()
    },
    onError: (err: any) => {
      toast.error("Save failed", {
        description: err?.message ?? "Please check your inputs and try again.",
      })
    },
  })

  const handleSave = () => {
    setPending(true)
    saveMutation.mutate()
    setPending(false)
  }

  return (
    <div className="grid gap-4">
      {/* Title */}
      <div className="grid gap-2">
        <label htmlFor="goal-title" className="text-sm font-medium text-ink">
          Title *
        </label>
        <Input
          id="goal-title"
          placeholder="e.g., Launch MVP, Learn Spanish"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="focus-visible:ring-brand/40"
          required
        />
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <label htmlFor="goal-desc" className="text-sm font-medium text-ink">
          Description
        </label>
        <Textarea
          id="goal-desc"
          placeholder="Describe what success looks like..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="focus-visible:ring-brand/40"
          rows={3}
        />
      </div>

      {/* Type */}
      <div className="grid gap-2">
        <label className="text-sm font-medium text-ink">Type *</label>
        <Select value={type} onValueChange={(v: "progressive" | "habitual") => setType(v)}>
          <SelectTrigger className="focus:ring-brand/40">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="progressive">Progressive (milestone-based)</SelectItem>
            <SelectItem value="habitual">Habitual (recurring)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Selection */}
      <div className="grid gap-2">
        <label className="text-sm font-medium text-ink">Category *</label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={parentId} onValueChange={resetChildCategory}>
            <SelectTrigger className="focus:ring-brand/40">
              <SelectValue placeholder="Parent category" />
            </SelectTrigger>
            <SelectContent>
              {parents.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={childId} onValueChange={setChildId} disabled={!parentId}>
            <SelectTrigger className="focus:ring-brand/40">
              <SelectValue placeholder="Child category" />
            </SelectTrigger>
            <SelectContent>
              {children.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Importance and Effort */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-ink">Importance</label>
          <Select value={String(importance)} onValueChange={(v) => setImportance(Number(v))}>
            <SelectTrigger className="focus:ring-brand/40">
              <SelectValue placeholder="Select importance" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} {n === 1 ? "(Low)" : n === 5 ? "(High)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <label htmlFor="effort" className="text-sm font-medium text-ink">
            Effort (hours)
          </label>
          <Input
            id="effort"
            type="number"
            min={0}
            step="0.5"
            placeholder="e.g., 20"
            value={effortHours}
            onChange={(e) => setEffortHours(e.target.value === "" ? "" : Number(e.target.value))}
            className="focus-visible:ring-brand/40"
          />
        </div>
      </div>

      <Separator />

      {/* Type-specific editors */}
      {type === "progressive" ? (
        <ProgressiveEditor milestones={milestones} setMilestones={setMilestones} />
      ) : (
        <HabitualEditor habitPlan={habitPlan} setHabitPlan={setHabitPlan} />
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="ghost" className="rounded-full" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          className="rounded-full bg-brand text-white hover:bg-brand/90 focus-visible:ring-brand/40"
          onClick={handleSave}
          disabled={pending || !title.trim() || !childId}
        >
          {pending ? "Saving..." : mode === "create" ? "Create Goal" : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}

function ProgressiveEditor({
  milestones,
  setMilestones,
}: {
  milestones: MilestoneDraft[]
  setMilestones: (ms: MilestoneDraft[]) => void
}) {
  const addMilestone = () => {
    setMilestones([...milestones, { title: "", target_date: "" }])
  }

  const updateMilestone = (idx: number, patch: Partial<MilestoneDraft>) => {
    setMilestones(milestones.map((m, i) => (i === idx ? { ...m, ...patch } : m)))
  }

  const removeMilestone = (idx: number) => {
    setMilestones(milestones.filter((_, i) => i !== idx))
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink">Milestones</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full text-brand hover:bg-brand/10"
          onClick={addMilestone}
        >
          <Plus className="mr-1 size-4" />
          Add milestone
        </Button>
      </div>

      <div className="grid gap-3">
        {milestones.map((milestone, idx) => (
          <div key={milestone.id ?? idx} className="grid gap-2 p-3 rounded-xl border border-ink/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink/70">Milestone {idx + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-ink/50 hover:text-ink hover:bg-ink/5"
                onClick={() => removeMilestone(idx)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Milestone title"
                value={milestone.title}
                onChange={(e) => updateMilestone(idx, { title: e.target.value })}
                className="focus-visible:ring-brand/40"
              />
              <Input
                type="date"
                value={milestone.target_date}
                onChange={(e) => updateMilestone(idx, { target_date: e.target.value })}
                className="focus-visible:ring-brand/40"
              />
            </div>
          </div>
        ))}

        {milestones.length === 0 && (
          <div className="text-center py-6 text-sm text-ink/50">
            No milestones yet. Add some to track your progress.
          </div>
        )}
      </div>
    </div>
  )
}

function HabitualEditor({
  habitPlan,
  setHabitPlan,
}: {
  habitPlan: HabitPlanDraft
  setHabitPlan: (hp: HabitPlanDraft) => void
}) {
  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-medium text-ink">Habit Plan</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-ink">Frequency</label>
          <Select
            value={habitPlan.frequency}
            onValueChange={(v: "daily" | "weekly" | "times_per_week") => {
              setHabitPlan({
                frequency: v,
                times_per_week: v === "times_per_week" ? (habitPlan.times_per_week ?? 3) : undefined,
              })
            }}
          >
            <SelectTrigger className="focus:ring-brand/40">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="times_per_week">Custom times per week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <label htmlFor="times-per-week" className="text-sm font-medium text-ink">
            Times per week
          </label>
          <Input
            id="times-per-week"
            type="number"
            min={1}
            max={7}
            disabled={habitPlan.frequency !== "times_per_week"}
            value={habitPlan.times_per_week ?? ""}
            onChange={(e) =>
              setHabitPlan({
                ...habitPlan,
                times_per_week: Number(e.target.value) || 1,
              })
            }
            className="focus-visible:ring-brand/40"
            placeholder="1-7"
          />
        </div>
      </div>

      <div className="text-xs text-ink/60 bg-sand/20 p-3 rounded-xl">
        {habitPlan.frequency === "daily" && "This habit will be tracked every day."}
        {habitPlan.frequency === "weekly" && "This habit will be tracked once per week."}
        {habitPlan.frequency === "times_per_week" &&
          `This habit will be tracked ${habitPlan.times_per_week ?? 3} times per week.`}
      </div>
    </div>
  )
}
