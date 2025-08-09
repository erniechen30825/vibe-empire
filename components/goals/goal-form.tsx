"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

type Mode = "create" | "edit"

type GoalRow = {
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

type MilestoneDraft = {
  id?: string
  title: string
  target_date?: string | null
}

type HabitPlanDraft = {
  // New schema
  frequency?: "daily" | "weekly" | "times_per_week"
  times_per_week?: number | null
  // Legacy schema fallback
  period?: "day" | "week"
  times_per_period?: number | null
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
  const [habitPlan, setHabitPlan] = useState<HabitPlanDraft>({})

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
    queryFn: async (): Promise<GoalRow | null> => {
      if (!goalId) return null
      const { data, error } = await supabase
        .from("goals")
        .select(
          "id,user_id,category_id,title,description,type,importance,effort_estimate_hours,status,created_at,updated_at",
        )
        .eq("id", goalId)
        .maybeSingle()
      if (error) throw error
      return (data as GoalRow) ?? null
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
    enabled: mode === "edit" && !!goalId && type === "progressive",
  })

  const habitPlanQuery = useQuery({
    queryKey: ["habit_plans", goalId],
    queryFn: async () => {
      if (!goalId) return null
      const { data, error } = await supabase.from("habit_plans").select("*").eq("goal_id", goalId).maybeSingle()
      if (error) throw error
      return data ?? null
    },
    enabled: mode === "edit" && !!goalId && type === "habitual",
  })

  useEffect(() => {
    if (mode === "edit" && goalQuery.data) {
      const g = goalQuery.data
      setTitle(g.title ?? "")
      setDescription(g.description ?? "")
      setType((g.type as any) ?? "progressive")
      setImportance(g.importance ?? 3)
      setEffortHours(g.effort_estimate_hours ?? "")
      // derive parent/child from category_id
      const all = categoriesQuery.data ?? []
      const child = all.find((c) => c.id === g.category_id) || null
      const parent = child?.parent_id ? all.find((c) => c.id === child.parent_id) || null : null
      setParentId(parent?.id ?? "")
      setChildId(child?.id ?? "")

      // milestones, habitPlan populate in subsequent effects from their queries
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, goalQuery.data, categoriesQuery.data])

  useEffect(() => {
    if (mode === "edit" && milestonesQuery.data && type === "progressive") {
      const ms = (milestonesQuery.data as any[]).map((m) => ({
        id: m.id,
        title: m.title ?? "",
        target_date: m.target_date ?? null,
      }))
      setMilestones(ms)
    }
  }, [mode, milestonesQuery.data, type])

  useEffect(() => {
    if (mode === "edit" && habitPlanQuery.data && type === "habitual") {
      const hp: any = habitPlanQuery.data
      if (hp?.frequency) {
        setHabitPlan({ frequency: hp.frequency, times_per_week: hp.times_per_week ?? null })
      } else if (hp?.period) {
        if (hp.period === "day") {
          setHabitPlan({ frequency: "daily" })
        } else if (hp.period === "week") {
          setHabitPlan({ frequency: "times_per_week", times_per_week: hp.times_per_period ?? 1 })
        }
      }
    }
  }, [mode, habitPlanQuery.data, type])

  const resetDependentCategory = (pid: string) => {
    setParentId(pid)
    setChildId("")
  }

  async function handleSave() {
    if (!title || !childId) {
      toast.error("Please fill required fields", { description: "Title and Category are required." })
      return
    }

    setPending(true)
    try {
      if (mode === "create") {
        // a) insert into goals
        const { data: created, error: gErr } = await supabase
          .from("goals")
          .insert({
            title,
            description: description || null,
            type,
            category_id: childId,
            importance: importance ?? null,
            effort_estimate_hours: typeof effortHours === "number" ? effortHours : Number(effortHours) || null,
            status: "active",
          } as Partial<GoalRow>)
          .select("id")
          .single()
        if (gErr) throw gErr
        const newGoalId = created?.id as string

        if (type === "progressive" && milestones.length) {
          const rows = milestones.map((m, idx) => ({
            goal_id: newGoalId,
            title: m.title,
            target_date: m.target_date ?? null,
            order_index: idx + 1,
          }))
          const { error: mErr } = await supabase.from("milestones").insert(rows as any[])
          if (mErr) throw mErr
        } else if (type === "habitual") {
          // Support new or legacy schema
          const hp = habitPlan
          if (hp.frequency) {
            const { error: hErr } = await supabase.from("habit_plans").insert({
              goal_id: newGoalId,
              frequency: hp.frequency,
              times_per_week: hp.frequency === "times_per_week" ? (hp.times_per_week ?? 1) : null,
            } as any)
            if (hErr) throw hErr
          } else {
            // legacy
            const { error: hErr } = await supabase.from("habit_plans").insert({
              goal_id: newGoalId,
              period: "week",
              times_per_period: 3,
            } as any)
            if (hErr) throw hErr
          }
        }

        toast.success("Goal created")
        qc.invalidateQueries({ queryKey: ["goals"] })
        onClose()
      } else if (mode === "edit" && goalId) {
        // a) update goals fields
        const { error: upErr } = await supabase
          .from("goals")
          .update({
            title,
            description: description || null,
            type,
            category_id: childId,
            importance: importance ?? null,
            effort_estimate_hours: typeof effortHours === "number" ? effortHours : Number(effortHours) || null,
          } as Partial<GoalRow>)
          .eq("id", goalId)
        if (upErr) throw upErr

        // sync milestones/habit plan depending on type
        if (type === "progressive") {
          // delete habit plan if switching
          await supabase.from("habit_plans").delete().eq("goal_id", goalId)

          // fetch existing
          const { data: existing } = await supabase.from("milestones").select("id").eq("goal_id", goalId)

          const existingIds = new Set((existing ?? []).map((m: any) => m.id as string))
          const keepIds = new Set(milestones.filter((m) => !!m.id).map((m) => m.id as string))

          // delete removed
          const toDelete = [...existingIds].filter((id) => !keepIds.has(id))
          if (toDelete.length) {
            await supabase.from("milestones").delete().in("id", toDelete)
          }

          // upserts
          const inserts = milestones
            .filter((m) => !m.id)
            .map((m, idx) => ({
              goal_id: goalId,
              title: m.title,
              target_date: m.target_date ?? null,
              order_index: idx + 1,
            }))
          if (inserts.length) {
            const { error: iErr } = await supabase.from("milestones").insert(inserts as any[])
            if (iErr) throw iErr
          }

          // updates (sequential)
          for (let idx = 0; idx < milestones.length; idx++) {
            const m = milestones[idx]
            if (m.id) {
              const { error: uErr } = await supabase
                .from("milestones")
                .update({ title: m.title, target_date: m.target_date ?? null, order_index: idx + 1 })
                .eq("id", m.id)
              if (uErr) throw uErr
            }
          }

          qc.invalidateQueries({ queryKey: ["milestones", goalId] })
        } else {
          // type === habitual
          // delete milestones if switching
          await supabase.from("milestones").delete().eq("goal_id", goalId)

          const hp = habitPlan
          // try new schema first (frequency)
          if (hp.frequency) {
            // upsert-like behavior
            const { data: existing } = await supabase
              .from("habit_plans")
              .select("id")
              .eq("goal_id", goalId)
              .maybeSingle()
            if (existing?.id) {
              const { error: uErr } = await supabase
                .from("habit_plans")
                .update({
                  frequency: hp.frequency,
                  times_per_week: hp.frequency === "times_per_week" ? (hp.times_per_week ?? 1) : null,
                } as any)
                .eq("goal_id", goalId)
              if (uErr) throw uErr
            } else {
              const { error: iErr } = await supabase.from("habit_plans").insert({
                goal_id: goalId,
                frequency: hp.frequency,
                times_per_week: hp.frequency === "times_per_week" ? (hp.times_per_week ?? 1) : null,
              } as any)
              if (iErr) throw iErr
            }
          } else {
            // legacy fallback
            const { data: existing } = await supabase
              .from("habit_plans")
              .select("id")
              .eq("goal_id", goalId)
              .maybeSingle()
            if (existing?.id) {
              await supabase
                .from("habit_plans")
                .update({ period: "week", times_per_period: 3 } as any)
                .eq("goal_id", goalId)
            } else {
              await supabase.from("habit_plans").insert({ goal_id: goalId, period: "week", times_per_period: 3 } as any)
            }
          }

          qc.invalidateQueries({ queryKey: ["habit_plans", goalId] })
        }

        toast.success("Goal updated")
        qc.invalidateQueries({ queryKey: ["goals"] })
        onClose()
      }
    } catch (err: any) {
      toast.error("Save failed", { description: err?.message ?? "Please check your inputs and try again." })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-4">
      {/* Title */}
      <div className="grid gap-2">
        <label htmlFor="goal-title" className="text-sm">
          Title
        </label>
        <Input
          id="goal-title"
          placeholder="e.g., Launch MVP"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <label htmlFor="goal-desc" className="text-sm">
          Description
        </label>
        <Textarea
          id="goal-desc"
          placeholder="Describe the goal outcomes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Type */}
      <div className="grid gap-2">
        <label className="text-sm">Type</label>
        <Select
          value={type}
          onValueChange={(v: "progressive" | "habitual") => {
            setType(v)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="progressive">progressive</SelectItem>
            <SelectItem value="habitual">habitual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category: Parent then Child */}
      <div className="grid gap-2">
        <label className="text-sm">Category</label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={parentId} onValueChange={(v) => resetDependentCategory(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Parent category" />
            </SelectTrigger>
            <SelectContent>
              {(parents ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={childId} onValueChange={setChildId} disabled={!parentId}>
            <SelectTrigger>
              <SelectValue placeholder="Child category" />
            </SelectTrigger>
            <SelectContent>
              {(children ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Importance and Effort */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm">Importance</label>
          <Select value={String(importance)} onValueChange={(v) => setImportance(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Select importance" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <label htmlFor="effort" className="text-sm">
            Effort hours
          </label>
          <Input
            id="effort"
            type="number"
            min={0}
            step="0.5"
            placeholder="e.g., 20"
            value={effortHours}
            onChange={(e) => setEffortHours(e.target.value === "" ? "" : Number(e.target.value))}
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

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="ghost" className="rounded-full" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          className="rounded-full bg-brand text-white hover:bg-brand/90 focus-visible:ring-brand/40"
          onClick={handleSave}
          disabled={pending}
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
  const addRow = () => {
    setMilestones([...(milestones ?? []), { title: "", target_date: "" }])
  }
  const updateRow = (idx: number, patch: Partial<MilestoneDraft>) => {
    setMilestones(milestones.map((m, i) => (i === idx ? { ...m, ...patch } : m)))
  }
  const removeRow = (idx: number) => {
    const next = milestones.slice()
    next.splice(idx, 1)
    setMilestones(next)
  }

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">Milestones</div>
      <div className="grid gap-3">
        {(milestones ?? []).map((m, idx) => (
          <div key={m.id ?? idx} className="grid gap-2 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <Input
                placeholder={`Milestone #${idx + 1} title`}
                value={m.title}
                onChange={(e) => updateRow(idx, { title: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                type="date"
                value={m.target_date ?? ""}
                onChange={(e) => updateRow(idx, { target_date: e.target.value })}
              />
            </div>
            <div className="sm:col-span-6 flex justify-end">
              <Button variant="ghost" className="rounded-full" onClick={() => removeRow(idx)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div>
        <Button className="rounded-full bg-mint text-ink hover:bg-mint/80" onClick={addRow}>
          Add milestone
        </Button>
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
  const freq = habitPlan.frequency ?? "daily"
  const tpw = habitPlan.times_per_week ?? 3

  return (
    <div className="grid gap-3">
      <div className="text-sm font-medium">Habit Plan</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm">Frequency</label>
          <Select
            value={freq}
            onValueChange={(v: "daily" | "weekly" | "times_per_week") => {
              setHabitPlan({
                frequency: v,
                times_per_week: v === "times_per_week" ? (habitPlan.times_per_week ?? 3) : null,
              })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">daily</SelectItem>
              <SelectItem value="weekly">weekly</SelectItem>
              <SelectItem value="times_per_week">times per week</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <label htmlFor="tpw" className="text-sm">
            Times per week
          </label>
          <Input
            id="tpw"
            type="number"
            min={1}
            max={7}
            disabled={freq !== "times_per_week"}
            value={tpw}
            onChange={(e) =>
              setHabitPlan({
                frequency: "times_per_week",
                times_per_week: Number(e.target.value || 1),
              })
            }
          />
        </div>
      </div>
    </div>
  )
}
