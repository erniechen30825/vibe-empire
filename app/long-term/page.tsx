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
import { CycleProgress } from "@/components/long-term/cycle-progress"
import { Calendar, Target, Clock, AlertCircle } from "lucide-react"
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

function ErrorCard({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return (
    <Card className="rounded-2xl border-red-200 bg-red-50/50">
      <CardContent className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">{title}</h3>
        <p className="text-red-600 mb-4">{description}</p>
        <Button
          onClick={onRetry}
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
        >
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-ink/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LongTermPage() {
  const { user, loading: authLoading } = useRequireAuth()
  const [showWizard, setShowWizard] = useState(false)

  // Enhanced long-terms query with better error handling
  const {
    data: longTerms,
    isLoading: longTermsLoading,
    error: longTermsError,
    refetch: refetchLongTerms,
  } = useQuery({
    queryKey: ["long-terms", user?.id],
    queryFn: async (): Promise<LongTerm[]> => {
      if (!user?.id) {
        throw new Error("User not authenticated")
      }

      if (typeof window === "undefined") {
        return []
      }

      try {
        const supabase = getSupabaseBrowser()
        const { data, error } = await supabase
          .from("long_terms")
          .select("id, user_id, title, start_date, end_date, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Long-terms query error:", error)
          throw new Error(`Failed to fetch long-term plans: ${error.message}`)
        }

        // Ensure we return an array and validate data structure
        const validatedData = (data || []).filter((item): item is LongTerm => {
          return (
            item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.user_id === "string" &&
            typeof item.title === "string"
          )
        })

        return validatedData
      } catch (error) {
        console.error("Long-terms fetch error:", error)
        throw error
      }
    },
    enabled: !!user?.id && typeof window !== "undefined",
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // Safe access to active plan with null checks
  const activePlan = longTerms?.find((plan) => plan?.status === "active") || null
  const activePlanId = activePlan?.id || null

  // Enhanced cycles query with proper dependency management
  const {
    data: cycles,
    isLoading: cyclesLoading,
    error: cyclesError,
    refetch: refetchCycles,
  } = useQuery({
    queryKey: ["cycles", activePlanId],
    queryFn: async (): Promise<Cycle[]> => {
      if (!activePlanId) {
        return []
      }

      if (typeof window === "undefined") {
        return []
      }

      try {
        const supabase = getSupabaseBrowser()
        const { data, error } = await supabase
          .from("cycles")
          .select("id, long_term_id, title, start_date, end_date, order_index")
          .eq("long_term_id", activePlanId)
          .order("order_index", { ascending: true })

        if (error) {
          console.error("Cycles query error:", error)
          throw new Error(`Failed to fetch cycles: ${error.message}`)
        }

        // Validate cycles data structure
        const validatedData = (data || []).filter((item): item is Cycle => {
          return (
            item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.long_term_id === "string" &&
            typeof item.title === "string"
          )
        })

        return validatedData
      } catch (error) {
        console.error("Cycles fetch error:", error)
        throw error
      }
    },
    enabled: !!activePlanId && typeof window !== "undefined",
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // Loading states
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-4"></div>
            <p className="text-ink/60">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorCard
          title="Authentication Required"
          description="Please sign in to access your long-term plans."
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  // Error states
  if (longTermsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand/20 text-brand">
              <Target className="size-5" />
            </div>
            <h1 className="text-3xl font-bold text-ink">Long-Term Plans</h1>
          </div>
        </div>
        <ErrorCard
          title="Failed to Load Plans"
          description={longTermsError instanceof Error ? longTermsError.message : "An unexpected error occurred"}
          onRetry={() => refetchLongTerms()}
        />
      </div>
    )
  }

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

      {longTermsLoading ? (
        <LoadingState />
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

          {/* Cycles Section */}
          {cyclesError ? (
            <ErrorCard
              title="Failed to Load Cycles"
              description={cyclesError instanceof Error ? cyclesError.message : "Could not load cycle information"}
              onRetry={() => refetchCycles()}
            />
          ) : cyclesLoading ? (
            <LoadingState />
          ) : cycles && cycles.length > 0 ? (
            <>
              <CycleProgress longTermId={activePlan.id} />
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
                              {format(new Date(cycle.start_date), "MMM d")} -{" "}
                              {format(new Date(cycle.end_date), "MMM d")}
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
            </>
          ) : (
            <Card className="rounded-2xl border-ink/10 bg-white/90">
              <CardContent className="p-6 text-center text-ink/60">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No cycles found for this plan</p>
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
