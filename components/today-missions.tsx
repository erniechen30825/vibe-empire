"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/empty-state"
import { Target, CheckCircle, Plus } from "lucide-react"
import { motion } from "framer-motion"

type Mission = {
  id: string
  user_id: string
  mission_date: string
  type: "highlight" | "habit" | "extra"
  is_highlight: boolean | null
  points: number | null
  is_completed: boolean | null
  completed_at: string | null
  task_id: string | null
  habit_plan_id: string | null
}

function todayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default function TodayMissions() {
  const { user } = useSupabaseUser()
  const qc = useQueryClient()
  const [highlightTitle, setHighlightTitle] = useState("")

  const day = todayISO()
  const qKey = useMemo(() => ["missions", user?.id, day], [user?.id, day])

  const { data: missions } = useQuery({
    queryKey: qKey,
    queryFn: async (): Promise<Mission[]> => {
      if (!user) return []
      const supabase = getSupabaseBrowser()
      const { data, error } = await supabase
        .from("missions")
        .select("id,user_id,mission_date,type,is_highlight,points,is_completed,completed_at,task_id,habit_plan_id")
        .eq("user_id", user.id)
        .eq("mission_date", day)
        .order("type", { ascending: true })
      if (error) throw error
      return (data as Mission[]) ?? []
    },
    enabled: !!user,
  })

  const highlight = missions?.find((m) => m.type === "highlight") ?? null
  const habits = missions?.filter((m) => m.type === "habit") ?? []
  const extras = missions?.filter((m) => m.type === "extra") ?? []

  const createHighlight = useMutation({
    mutationFn: async (title: string) => {
      if (!user) throw new Error("Not signed in")
      const supabase = getSupabaseBrowser()
      // In a full app, you'd also create a related task and link task_id. For MVP, store points and completion states directly on mission.
      const { error } = await supabase.from("missions").insert({
        user_id: user.id,
        mission_date: day,
        type: "highlight",
        is_highlight: true,
        points: 10,
        is_completed: false,
        // Optional: attach to a task later
      } as Partial<Mission>)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qKey })
      setHighlightTitle("")
    },
  })

  const toggleComplete = useMutation({
    mutationFn: async (mission: Mission) => {
      const supabase = getSupabaseBrowser()
      const now = new Date().toISOString()
      const { error } = await supabase
        .from("missions")
        .update({
          is_completed: !mission.is_completed,
          completed_at: mission.is_completed ? null : now,
        })
        .eq("id", mission.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  })

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center justify-center size-9 rounded-xl bg-emerald-100 text-emerald-700">
            <Target className="size-5" />
          </div>
          <CardTitle className="text-lg font-semibold">{"Today’s Missions"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0 grid gap-4">
        {/* Highlight */}
        <div className="rounded-xl border bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Highlight</Badge>
              <span className="text-sm text-muted-foreground">{"One focus that makes today a win."}</span>
            </div>
          </div>

          <div className="mt-3">
            {highlight ? (
              <motion.label
                layout
                htmlFor={`hl-${highlight.id}`}
                className="flex items-center gap-3 cursor-pointer select-none"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
              >
                <Checkbox
                  id={`hl-${highlight.id}`}
                  checked={!!highlight.is_completed}
                  onCheckedChange={() => toggleComplete.mutate(highlight)}
                  aria-label="Toggle highlight complete"
                />
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{"Today's highlight"}</span>
                  {highlight.is_completed ? (
                    <CheckCircle className="size-4 text-emerald-600" aria-hidden="true" />
                  ) : null}
                </div>
              </motion.label>
            ) : (
              <div className="grid gap-2 sm:flex sm:items-center">
                <Input
                  value={highlightTitle}
                  onChange={(e) => setHighlightTitle(e.target.value)}
                  placeholder="Name your highlight (optional)"
                  className="sm:max-w-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createHighlight.mutate(highlightTitle.trim())
                  }}
                />
                <Button
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                  onClick={() => createHighlight.mutate(highlightTitle.trim())}
                >
                  <Plus className="mr-2 size-4" />
                  Set today’s highlight
                </Button>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Habits */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Habits</div>
            <Badge variant="secondary" className="rounded-full bg-muted">
              Today
            </Badge>
          </div>
          {habits.length === 0 ? (
            <EmptyState
              title="No habit missions yet"
              description="Habit missions will appear here. You can add habit plans under Goals later."
            />
          ) : (
            <ul className="grid gap-2">
              {habits.map((m) => (
                <motion.li key={m.id} layout className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50/50">
                  <Checkbox
                    id={`habit-${m.id}`}
                    checked={!!m.is_completed}
                    onCheckedChange={() => toggleComplete.mutate(m)}
                    aria-label="Toggle habit mission complete"
                  />
                  <label htmlFor={`habit-${m.id}`} className="text-sm cursor-pointer">
                    {"Habit"}
                  </label>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        {/* Extras */}
        <div className="grid gap-2">
          <div className="text-sm font-medium">Extras</div>
          {extras.length === 0 ? (
            <EmptyState title="No extras" description="Optional extra missions show here. Keep it light and focused." />
          ) : (
            <ul className="grid gap-2">
              {extras.map((m) => (
                <motion.li key={m.id} layout className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50/50">
                  <Checkbox
                    id={`extra-${m.id}`}
                    checked={!!m.is_completed}
                    onCheckedChange={() => toggleComplete.mutate(m)}
                    aria-label="Toggle extra mission complete"
                  />
                  <label htmlFor={`extra-${m.id}`} className="text-sm cursor-pointer">
                    {"Extra"}
                  </label>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
