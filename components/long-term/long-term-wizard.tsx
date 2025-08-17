"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { addDays, addWeeks, format, startOfWeek, addMonths } from "date-fns"
import { AlertCircle } from "lucide-react"

type Goal = {
  id: string
  title: string
  type: "progressive" | "habitual"
  status: "active" | "completed"
}

type CycleGoal = {
  goal_id: string
  expected_progress: string
  expected_hours: number
}

export function LongTermWizard({ onClose }: { onClose: () => void }) {
  const { user } = useRequireAuth()
  const queryClient = useQueryClient()

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState("")
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [cycleGoals, setCycleGoals] = useState<Record<string, CycleGoal>>({})
  const [error, setError] = useState<string | null>(null)

  // Calculate default dates (3 months from next Monday)
  const nextMonday = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 })
  const endDate = addMonths(nextMonday, 3)

  // Generate 6 cycles of 14 days each
  const cycles = Array.from({ length: 6 }, (_, i) => ({
    title: `Cycle ${i + 1}`,
    start_date: addDays(nextMonday, i * 14),
    end_date: addDays(nextMonday, (i + 1) * 14 - 1),
    order_index: i + 1,
  }))

  const { data: goals, error: goalsError } = useQuery({
    queryKey: ["goals", user?.id],
    queryFn: async (): Promise<Goal[]> => {
      if (!user?.id || typeof window === "undefined") {
        return []
      }

      try {
        const supabase = getSupabaseBrowser()
        const { data, error } = await supabase
          .from("goals")
          .select("id, title, type, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("title")

        if (error) {
          throw new Error(`Failed to fetch goals: ${error.message}`)
        }

        // Validate goals data structure
        const validatedData = (data || []).filter((item): item is Goal => {
          return (
            item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            (item.type === "progressive" || item.type === "habitual") &&
            (item.status === "active" || item.status === "completed")
          )
        })

        return validatedData
      } catch (error) {
        console.error("Goals fetch error:", error)
        throw error
      }
    },
    enabled: !!user?.id && typeof window !== "undefined",
    retry: 2,
  })

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated")
      }

      if (!title.trim()) {
        throw new Error("Plan title is required")
      }

      if (selectedGoals.size === 0) {
        throw new Error("Please select at least one goal")
      }

      const supabase = getSupabaseBrowser()

      try {
        // Create long-term plan
        const { data: longTerm, error: longTermError } = await supabase
          .from("long_terms")
          .insert({
            user_id: user.id,
            title: title.trim(),
            start_date: format(nextMonday, "yyyy-MM-dd"),
            end_date: format(endDate, "yyyy-MM-dd"),
            status: "active",
          })
          .select("id")
          .single()

        if (longTermError) {
          throw new Error(`Failed to create plan: ${longTermError.message}`)
        }

        if (!longTerm?.id) {
          throw new Error("Failed to create plan: No ID returned")
        }

        // Create cycles
        const cycleInserts = cycles.map((cycle) => ({
          long_term_id: longTerm.id,
          title: cycle.title,
          start_date: format(cycle.start_date, "yyyy-MM-dd"),
          end_date: format(cycle.end_date, "yyyy-MM-dd"),
          order_index: cycle.order_index,
        }))

        const { data: createdCycles, error: cyclesError } = await supabase
          .from("cycles")
          .insert(cycleInserts)
          .select("id, order_index")

        if (cyclesError) {
          throw new Error(`Failed to create cycles: ${cyclesError.message}`)
        }

        if (!createdCycles || createdCycles.length === 0) {
          throw new Error("Failed to create cycles: No cycles returned")
        }

        // Create cycle goals if configured
        const cycleGoalInserts: any[] = []
        createdCycles.forEach((cycle) => {
          selectedGoals.forEach((goalId) => {
            const goalConfig = cycleGoals[goalId]
            if (goalConfig) {
              cycleGoalInserts.push({
                cycle_id: cycle.id,
                goal_id: goalId,
                expected_progress: goalConfig.expected_progress,
                expected_hours: goalConfig.expected_hours,
              })
            }
          })
        })

        if (cycleGoalInserts.length > 0) {
          const { error: cycleGoalsError } = await supabase.from("cycle_goals").insert(cycleGoalInserts)

          if (cycleGoalsError) {
            console.warn("Failed to create cycle goals:", cycleGoalsError)
            // Don't throw here as the main plan was created successfully
          }
        }

        return longTerm
      } catch (error) {
        console.error("Plan creation error:", error)
        throw error
      }
    },
    onSuccess: () => {
      toast.success("3-month plan created!", { description: "Your cycles are ready to go." })
      queryClient.invalidateQueries({ queryKey: ["long-terms"] })
      queryClient.invalidateQueries({ queryKey: ["cycles"] })
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to create plan"
      setError(errorMessage)
      toast.error("Failed to create plan", { description: errorMessage })
    },
  })

  const handleGoalToggle = (goalId: string) => {
    const newSelected = new Set(selectedGoals)
    if (newSelected.has(goalId)) {
      newSelected.delete(goalId)
      const newCycleGoals = { ...cycleGoals }
      delete newCycleGoals[goalId]
      setCycleGoals(newCycleGoals)
    } else {
      newSelected.add(goalId)
      setCycleGoals((prev) => ({
        ...prev,
        [goalId]: {
          goal_id: goalId,
          expected_progress: "",
          expected_hours: 5,
        },
      }))
    }
    setSelectedGoals(newSelected)
    setError(null)
  }

  const updateCycleGoal = (goalId: string, field: keyof CycleGoal, value: string | number) => {
    setCycleGoals((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        [field]: value,
      },
    }))
  }

  // Error handling for goals loading
  if (goalsError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load goals: {goalsError instanceof Error ? goalsError.message : "Unknown error"}
          </AlertDescription>
        </Alert>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className="text-lg font-semibold text-ink mb-2">Plan Details</h3>
          <p className="text-sm text-ink/70 mb-4">Create a 3-month plan with 6 cycles of 2 weeks each.</p>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="title" className="text-sm font-medium text-ink">
              Plan Title *
            </label>
            <Input
              id="title"
              placeholder="e.g., Q1 2024 Growth Plan"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setError(null)
              }}
              className="focus-visible:ring-brand/40"
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium text-ink">Timeline</div>
            <div className="text-sm text-ink/70">
              <div>Start: {format(nextMonday, "MMMM d, yyyy")}</div>
              <div>End: {format(endDate, "MMMM d, yyyy")}</div>
              <div>Duration: 3 months (6 cycles × 2 weeks)</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!title.trim()) {
                setError("Plan title is required")
                return
              }
              setStep(2)
            }}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            Next: Select Goals
          </Button>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className="text-lg font-semibold text-ink mb-2">Select Goals</h3>
          <p className="text-sm text-ink/70 mb-4">Choose which active goals to include in this 3-month plan.</p>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {goals && goals.length > 0 ? (
            goals.map((goal) => (
              <div key={goal.id} className="flex items-center space-x-3 p-3 rounded-xl border border-ink/10">
                <Checkbox
                  id={`goal-${goal.id}`}
                  checked={selectedGoals.has(goal.id)}
                  onCheckedChange={() => handleGoalToggle(goal.id)}
                />
                <label htmlFor={`goal-${goal.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium text-ink">{goal.title}</div>
                  <div className="text-sm text-ink/60 capitalize">{goal.type}</div>
                </label>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-ink/60">
              <p>No active goals found</p>
              <p className="text-xs mt-1">Create some goals first to include them in your plan</p>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep(1)}>
            Back
          </Button>
          <Button
            onClick={() => {
              if (selectedGoals.size === 0) {
                setError("Please select at least one goal")
                return
              }
              setStep(3)
            }}
            disabled={!goals || goals.length === 0}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            Next: Configure Goals
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <h3 className="text-lg font-semibold text-ink mb-2">Configure Goals</h3>
        <p className="text-sm text-ink/70 mb-4">Set expectations for each goal across all cycles.</p>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Array.from(selectedGoals).map((goalId) => {
          const goal = goals?.find((g) => g.id === goalId)
          const config = cycleGoals[goalId]

          if (!goal) return null

          return (
            <Card key={goalId} className="rounded-xl border-ink/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-ink">{goal.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div>
                  <label className="text-sm font-medium text-ink">Expected Progress (per cycle)</label>
                  <Input
                    placeholder="e.g., Complete 2 milestones, Practice 5 days/week"
                    value={config?.expected_progress || ""}
                    onChange={(e) => updateCycleGoal(goalId, "expected_progress", e.target.value)}
                    className="focus-visible:ring-brand/40"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink">Expected Hours (per cycle)</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={config?.expected_hours || 5}
                    onChange={(e) => updateCycleGoal(goalId, "expected_hours", Number.parseInt(e.target.value) || 5)}
                    className="focus-visible:ring-brand/40"
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator />

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(2)}>
          Back
        </Button>
        <Button
          onClick={() => createPlanMutation.mutate()}
          disabled={createPlanMutation.isPending}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
        </Button>
      </div>
    </div>
  )
}
