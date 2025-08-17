"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Calendar, Target, TrendingUp, AlertCircle } from "lucide-react"
import { format, differenceInDays, isAfter, isBefore } from "date-fns"

interface CycleProgressProps {
  longTermId: string
}

export function CycleProgress({ longTermId }: CycleProgressProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const { data: cycles, error } = useQuery({
    queryKey: ["cycle-progress", longTermId],
    queryFn: async () => {
      if (!isClient || !longTermId) {
        return []
      }

      try {
        const supabase = getSupabaseBrowser()
        const { data, error } = await supabase
          .from("cycles")
          .select("id, title, start_date, end_date, order_index")
          .eq("long_term_id", longTermId)
          .order("order_index", { ascending: true })

        if (error) {
          console.error("Cycle progress query error:", error)
          throw new Error(`Failed to fetch cycle progress: ${error.message}`)
        }

        // Validate data structure
        const validatedData = (data || []).filter((item) => {
          return (
            item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            typeof item.start_date === "string" &&
            typeof item.end_date === "string"
          )
        })

        return validatedData
      } catch (error) {
        console.error("Cycle progress fetch error:", error)
        throw error
      }
    },
    enabled: isClient && !!longTermId,
    retry: 2,
  })

  const getCurrentCycle = () => {
    if (!cycles || !Array.isArray(cycles)) return null

    const today = new Date()
    return cycles.find((cycle) => {
      try {
        const start = new Date(cycle.start_date)
        const end = new Date(cycle.end_date)
        return !isBefore(today, start) && !isAfter(today, end)
      } catch (error) {
        console.error("Date parsing error for cycle:", cycle, error)
        return false
      }
    })
  }

  if (!isClient) {
    return (
      <Card className="rounded-2xl border-ink/10">
        <CardContent className="p-6 text-center text-ink/60">
          <div className="animate-pulse">
            <div className="h-4 bg-ink/10 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-ink/10 rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-red-200 bg-red-50/50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm">Failed to load cycle progress</p>
        </CardContent>
      </Card>
    )
  }

  if (!cycles || cycles.length === 0) {
    return (
      <Card className="rounded-2xl border-ink/10">
        <CardContent className="p-6 text-center text-ink/60">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No cycles found</p>
        </CardContent>
      </Card>
    )
  }

  const currentCycle = getCurrentCycle()

  return (
    <div className="space-y-4">
      {/* Current Cycle Highlight */}
      {currentCycle && (
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-emerald-800 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Current Cycle: {currentCycle.title}
              </CardTitle>
              <Badge className="bg-emerald-200 text-emerald-800">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-emerald-700">
                <span>{format(new Date(currentCycle.start_date), "MMM d")}</span>
                <span>{format(new Date(currentCycle.end_date), "MMM d")}</span>
              </div>
              <Progress
                value={calculateCycleProgress(currentCycle)}
                className="h-2 bg-emerald-100 [&>div]:bg-emerald-500"
              />
              <div className="text-xs text-emerald-600 text-center">
                {getDaysRemaining(currentCycle)} days remaining
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Cycles Overview */}
      <Card className="rounded-2xl border-ink/10">
        <CardHeader>
          <CardTitle className="text-ink flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cycle Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {cycles.map((cycle, index) => {
              const isCurrent = cycle.id === currentCycle?.id
              const isPast = isAfter(new Date(), new Date(cycle.end_date))
              const progress = calculateCycleProgress(cycle)

              return (
                <div
                  key={cycle.id}
                  className={`p-3 rounded-xl border transition-colors ${
                    isCurrent
                      ? "border-emerald-200 bg-emerald-50/30"
                      : isPast
                        ? "border-ink/10 bg-ink/5"
                        : "border-ink/10 hover:bg-sand/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`inline-flex size-8 items-center justify-center rounded-lg text-sm font-medium ${
                          isCurrent
                            ? "bg-emerald-200 text-emerald-800"
                            : isPast
                              ? "bg-ink/10 text-ink/60"
                              : "bg-brand/10 text-brand"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-ink">{cycle.title}</div>
                        <div className="text-sm text-ink/60">
                          {format(new Date(cycle.start_date), "MMM d")} - {format(new Date(cycle.end_date), "MMM d")}
                        </div>
                      </div>
                    </div>
                    <Badge variant={isCurrent ? "default" : isPast ? "secondary" : "outline"}>
                      {isCurrent ? "Current" : isPast ? "Completed" : "Upcoming"}
                    </Badge>
                  </div>

                  {(isCurrent || isPast) && (
                    <div className="mt-2">
                      <Progress
                        value={progress}
                        className={`h-1.5 ${
                          isCurrent ? "bg-emerald-100 [&>div]:bg-emerald-500" : "bg-ink/10 [&>div]:bg-ink/30"
                        }`}
                      />
                      <div className="text-xs text-ink/60 mt-1 text-right">{Math.round(progress)}% complete</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function calculateCycleProgress(cycle: any): number {
  try {
    const start = new Date(cycle.start_date)
    const end = new Date(cycle.end_date)
    const now = new Date()

    if (isBefore(now, start)) return 0
    if (isAfter(now, end)) return 100

    const totalDays = differenceInDays(end, start)
    const elapsedDays = differenceInDays(now, start)

    return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))
  } catch (error) {
    console.error("Error calculating cycle progress:", error)
    return 0
  }
}

function getDaysRemaining(cycle: any): number {
  try {
    const end = new Date(cycle.end_date)
    const now = new Date()
    return Math.max(0, differenceInDays(end, now))
  } catch (error) {
    console.error("Error calculating days remaining:", error)
    return 0
  }
}
