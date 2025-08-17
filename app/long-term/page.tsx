"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LongTermWizard } from "@/components/long-term/long-term-wizard"
import { Calendar, Target, Clock } from "lucide-react"
import { format } from "date-fns"

export const dynamic = "force-dynamic"

type LongTerm = {
  id: string
  user_id: string
  title: string
  start_date: string
  end_date: string
  status: "active" | "archived"
  created_at: string
}

type Cycle = {
  id: string
  long_term_id: string
  title: string
  start_date: string
  end_date: string
  order_index: number
}

export default function LongTermPage() {
  const { user, loading: authLoading } = useRequireAuth()
  const [showWizard, setShowWizard] = useState(false)

  const { data: longTerms, isLoading } = useQuery({
    queryKey: ["long-terms", user?.id],
    queryFn: async (): Promise<LongTerm[]> => {
      const supabase = getSupabaseBrowser()
      const { data, error } = await supabase
        .from("long_terms")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

  const { data: cycles } = useQuery({
    queryKey: ["cycles", longTerms?.[0]?.id],
    queryFn: async (): Promise<Cycle[]> => {
      if (!longTerms?.[0]?.id) return []

      const supabase = getSupabaseBrowser()
      const { data, error } = await supabase
        .from("cycles")
        .select("*")
        .eq("long_term_id", longTerms[0].id)
        .order("order_index", { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!longTerms?.[0]?.id,
  })

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-4"></div>
            <p className="text-ink/60">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  const activePlan = longTerms?.find((plan) => plan.status === "active")

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand/20 text-brand">
            <Target className="size-5" />
          </div>
          <h1 className="text-3xl font-bold text-ink">Long-Term Plans</h1>
        </div>

        {!activePlan && (
          <Button onClick={() => setShowWizard(true)} className="bg-brand hover:bg-brand/90 text-white rounded-full">
            Create 3-Month Plan
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Card className="rounded-2xl border-ink/10">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : !activePlan ? (
        <Card className="rounded-2xl border-ink/10 bg-white/90">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-ink/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-ink mb-2">No active long-term plan</h3>
            <p className="text-ink/60 mb-6">
              Create a 3-month plan to organize your goals into manageable cycles and track your progress.
            </p>
            <Button onClick={() => setShowWizard(true)} className="bg-brand hover:bg-brand/90 text-white rounded-full">
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Plan Overview */}
          <Card className="rounded-2xl border-ink/10 bg-white/90">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-ink flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {activePlan.title}
                </CardTitle>
                <Badge className="bg-mint/60 text-ink">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-ink/70">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(activePlan.start_date), "MMM d")} -{" "}
                    {format(new Date(activePlan.end_date), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-ink/70">
                  <Clock className="w-4 h-4" />
                  <span>{cycles?.length || 0} cycles planned</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cycles */}
          {cycles && cycles.length > 0 && (
            <Card className="rounded-2xl border-ink/10 bg-white/90">
              <CardHeader>
                <CardTitle className="text-ink">Cycles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {cycles.map((cycle, index) => (
                    <div
                      key={cycle.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-ink/10 hover:bg-sand/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="inline-flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-ink">{cycle.title}</div>
                          <div className="text-sm text-ink/60">
                            {format(new Date(cycle.start_date), "MMM d")} - {format(new Date(cycle.end_date), "MMM d")}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-ink/20 text-ink">
                        {index === 0 ? "Current" : "Upcoming"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-ink">Create 3-Month Plan</DialogTitle>
          </DialogHeader>
          <LongTermWizard onClose={() => setShowWizard(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
