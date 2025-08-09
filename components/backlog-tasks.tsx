"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/empty-state"
import { Plus, ListTodo } from "lucide-react"
import { motion } from "framer-motion"

type Task = {
  id: string
  user_id: string
  goal_id: string | null
  title: string
  due_date: string | null
  estimated_hours: number | null
  status: "todo" | "in_progress" | "done" | "skipped"
  importance: number | null
}

export default function BacklogTasks() {
  const { user } = useSupabaseUser()
  const qc = useQueryClient()
  const [newTitle, setNewTitle] = useState("")

  const qKey = useMemo(() => ["backlog", user?.id], [user?.id])

  const { data: tasks } = useQuery({
    queryKey: qKey,
    queryFn: async (): Promise<Task[]> => {
      if (!user) return []
      const supabase = getSupabaseBrowser()
      const { data, error } = await supabase
        .from("tasks")
        .select("id,user_id,goal_id,title,due_date,estimated_hours,status,importance")
        .eq("user_id", user.id)
        .is("due_date", null) // Backlog rule
        .neq("status", "archived" as any)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data as Task[]) ?? []
    },
    enabled: !!user,
  })

  const addTask = useMutation({
    mutationFn: async (title: string) => {
      if (!user) throw new Error("Not signed in")
      const supabase = getSupabaseBrowser()
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        goal_id: null,
        title,
        due_date: null,
        estimated_hours: null,
        status: "todo",
        is_generated: false,
        importance: 3,
      } as any)
      if (error) throw error
    },
    onSuccess: () => {
      setNewTitle("")
      qc.invalidateQueries({ queryKey: qKey })
    },
  })

  const toggleDone = useMutation({
    mutationFn: async (task: Task) => {
      const supabase = getSupabaseBrowser()
      const isDone = task.status === "done"
      const { error } = await supabase
        .from("tasks")
        .update({
          status: isDone ? "todo" : "done",
          completed_at: isDone ? null : new Date().toISOString(),
        })
        .eq("id", task.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  })

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center justify-center size-9 rounded-xl bg-emerald-100 text-emerald-700">
            <ListTodo className="size-5" />
          </div>
          <CardTitle className="text-lg font-semibold">Backlog</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="flex gap-2 flex-col sm:flex-row">
          <Input
            placeholder="Quick add a task (no due date)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim()) addTask.mutate(newTitle.trim())
            }}
          />
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
            onClick={() => newTitle.trim() && addTask.mutate(newTitle.trim())}
          >
            <Plus className="mr-2 size-4" />
            Add
          </Button>
        </div>

        <div className="mt-4">
          {tasks && tasks.length > 0 ? (
            <ul className="grid gap-2">
              {tasks.map((t) => (
                <motion.li
                  key={t.id}
                  layout
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50/50"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 240, damping: 18 }}
                >
                  <Checkbox
                    id={`t-${t.id}`}
                    checked={t.status === "done"}
                    onCheckedChange={() => toggleDone.mutate(t)}
                    aria-label={`Mark ${t.title} ${t.status === "done" ? "incomplete" : "done"}`}
                  />
                  <label
                    htmlFor={`t-${t.id}`}
                    className={`text-sm cursor-pointer ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}
                  >
                    {t.title}
                  </label>
                </motion.li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Backlog is clear"
              description="Capture ideas here without due dates. Keep it calm and focused."
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
