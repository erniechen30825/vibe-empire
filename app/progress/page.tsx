"use client"

import { useQuery } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Award, Calendar } from "lucide-react"
import { format } from "date-fns"

type PointsEntry = {
  id: string
  points: number
  reason: string
  occurred_at: string
  mission_id?: string
}

type UserStats = {
  total_points: number
  current_level: number
  missions_completed_today: number
  goals_completed: number
  current_streak: number
}

export default function ProgressPage() {
  const { user, loading: authLoading } = useRequireAuth()

  const { data: pointsHistory, isLoading: pointsLoading } = useQuery({
    queryKey: ["points-history", user?.id],
    queryFn: async (): Promise<PointsEntry[]> => {
      const supabase = getSupabaseBrowser()
      const { data, error } = await supabase
        .from("points_ledger")
        .select("id, points, reason, occurred_at, mission_id")
        .eq("user_id", user!.id)
        .order("occurred_at", { ascending: false })
        .limit(20)

      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

  const { data: stats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async (): Promise<UserStats> => {
      const supabase = getSupabaseBrowser()

      // Get total points
      const { data: pointsData } = await supabase.from("points_ledger").select("points").eq("user_id", user!.id)

      const totalPoints = pointsData?.reduce((sum, entry) => sum + entry.points, 0) || 0
      const currentLevel = Math.floor(totalPoints / 100) + 1

      // Get today's missions
      const today = new Date().toISOString().split("T")[0]
      const { data: todayMissions } = await supabase
        .from("missions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("mission_date", today)
        .eq("is_completed", true)

      // Get completed goals
      const { data: completedGoals } = await supabase
        .from("goals")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "completed")

      return {
        total_points: totalPoints,
        current_level: currentLevel,
        missions_completed_today: todayMissions?.length || 0,
        goals_completed: completedGoals?.length || 0,
        current_streak: 0, // TODO: Calculate streak
      }
    },
    enabled: !!user,
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

  const currentXP = (stats?.total_points || 0) % 100
  const nextLevelXP = 100

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand/20 text-brand">
          <TrendingUp className="size-5" />
        </div>
        <h1 className="text-3xl font-bold text-ink">Progress</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Level & XP */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-ink/10 bg-white/90">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <Award className="w-5 h-5" />
                Level Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-ink">Level {stats?.current_level || 1}</div>
                    <div className="text-sm text-ink/60">{stats?.total_points || 0} total points</div>
                  </div>
                  <Badge className="bg-brand/20 text-brand">
                    {currentXP}/{nextLevelXP} XP
                  </Badge>
                </div>
                <Progress value={(currentXP / nextLevelXP) * 100} className="h-3 bg-ink/10 [&>div]:bg-brand" />
                <div className="text-xs text-ink/60">{nextLevelXP - currentXP} XP until next level</div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="rounded-2xl border-ink/10 bg-white/90">
            <CardHeader>
              <CardTitle className="text-ink">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {pointsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : pointsHistory && pointsHistory.length > 0 ? (
                <div className="space-y-3">
                  {pointsHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-2 border-b border-ink/5 last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-ink capitalize">{entry.reason.replace(/_/g, " ")}</div>
                        <div className="text-xs text-ink/60">
                          {format(new Date(entry.occurred_at), "MMM d, h:mm a")}
                        </div>
                      </div>
                      <Badge
                        variant={entry.points > 0 ? "default" : "secondary"}
                        className={entry.points > 0 ? "bg-mint/60 text-ink" : ""}
                      >
                        {entry.points > 0 ? "+" : ""}
                        {entry.points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-ink/60">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No activity yet</p>
                  <p className="text-xs">Complete missions to see your progress here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-ink/10 bg-white/90">
            <CardHeader>
              <CardTitle className="text-ink">Today's Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink/70">Missions completed</span>
                <span className="font-semibold text-ink">{stats?.missions_completed_today || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink/70">Current streak</span>
                <span className="font-semibold text-ink">{stats?.current_streak || 0} days</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-ink/10 bg-white/90">
            <CardHeader>
              <CardTitle className="text-ink">All Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink/70">Goals completed</span>
                <span className="font-semibold text-ink">{stats?.goals_completed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink/70">Total points</span>
                <span className="font-semibold text-ink">{stats?.total_points || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
