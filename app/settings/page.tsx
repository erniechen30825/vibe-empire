"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { SettingsIcon, Save } from "lucide-react"

type UserSettings = {
  user_id: string
  long_term_months: number
  cycle_days: number
  highlight_points: number
  habit_min: number
  habit_max: number
  extra_points: number
  difficulty_scaling: boolean
}

const defaultSettings: Omit<UserSettings, "user_id"> = {
  long_term_months: 3,
  cycle_days: 14,
  highlight_points: 30,
  habit_min: 5,
  habit_max: 10,
  extra_points: 10,
  difficulty_scaling: false,
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useRequireAuth()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<Omit<UserSettings, "user_id">>(defaultSettings)

  const { data: settings, isLoading } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async (): Promise<UserSettings | null> => {
      const supabase = getSupabaseBrowser()
      const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle()

      if (error && error.code !== "PGRST116") throw error
      return data
    },
    enabled: !!user,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          long_term_months: data.long_term_months,
          cycle_days: data.cycle_days,
          highlight_points: data.highlight_points,
          habit_min: data.habit_min,
          habit_max: data.habit_max,
          extra_points: data.extra_points,
          difficulty_scaling: data.difficulty_scaling,
        })
      }
    },
  })

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated")

      const supabase = getSupabaseBrowser()
      const { error } = await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          ...formData,
        },
        { onConflict: "user_id" },
      )

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Settings saved!", { description: "Your preferences have been updated." })
      queryClient.invalidateQueries({ queryKey: ["user-settings"] })
    },
    onError: (error: any) => {
      toast.error("Failed to save settings", { description: error.message })
    },
  })

  const updateField = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand/20 text-brand">
          <SettingsIcon className="size-5" />
        </div>
        <h1 className="text-3xl font-bold text-ink">Settings</h1>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Card className="rounded-2xl border-ink/10">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Planning Settings */}
          <Card className="rounded-2xl border-ink/10 bg-white/90">
            <CardHeader>
              <CardTitle className="text-ink">Planning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="long-term-months" className="text-sm font-medium text-ink">
                    Long-term plan duration (months)
                  </label>
                  <Input
                    id="long-term-months"
                    type="number"
                    min="1"
                    max="12"
                    value={formData.long_term_months}
                    onChange={(e) => updateField("long_term_months", Number.parseInt(e.target.value) || 3)}
                    className="focus-visible:ring-brand/40"
                  />
                </div>
                <div>
                  <label htmlFor="cycle-days" className="text-sm font-medium text-ink">
                    Cycle length (days)
                  </label>
                  <Input
                    id="cycle-days"
                    type="number"
                    min="7"
                    max="30"
                    value={formData.cycle_days}
                    onChange={(e) => updateField("cycle_days", Number.parseInt(e.target.value) || 14)}
                    className="focus-visible:ring-brand/40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points Settings */}
          <Card className="rounded-2xl border-ink/10 bg-white/90">
            <CardHeader>
              <CardTitle className="text-ink">Points & Rewards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="highlight-points" className="text-sm font-medium text-ink">
                    Highlight mission points
                  </label>
                  <Input
                    id="highlight-points"
                    type="number"
                    min="10"
                    max="100"
                    value={formData.highlight_points}
                    onChange={(e) => updateField("highlight_points", Number.parseInt(e.target.value) || 30)}
                    className="focus-visible:ring-brand/40"
                  />
                </div>
                <div>
                  <label htmlFor="extra-points" className="text-sm font-medium text-ink">
                    Extra mission points
                  </label>
                  <Input
                    id="extra-points"
                    type="number"
                    min="5"
                    max="50"
                    value={formData.extra_points}
                    onChange={(e) => updateField("extra_points", Number.parseInt(e.target.value) || 10)}
                    className="focus-visible:ring-brand/40"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="habit-min" className="text-sm font-medium text-ink">
                    Habit points (minimum)
                  </label>
                  <Input
                    id="habit-min"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.habit_min}
                    onChange={(e) => updateField("habit_min", Number.parseInt(e.target.value) || 5)}
                    className="focus-visible:ring-brand/40"
                  />
                </div>
                <div>
                  <label htmlFor="habit-max" className="text-sm font-medium text-ink">
                    Habit points (maximum)
                  </label>
                  <Input
                    id="habit-max"
                    type="number"
                    min="5"
                    max="50"
                    value={formData.habit_max}
                    onChange={(e) => updateField("habit_max", Number.parseInt(e.target.value) || 10)}
                    className="focus-visible:ring-brand/40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card className="rounded-2xl border-ink/10 bg-white/90">
            <CardHeader>
              <CardTitle className="text-ink">Advanced</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="difficulty-scaling"
                  checked={formData.difficulty_scaling}
                  onCheckedChange={(checked) => updateField("difficulty_scaling", !!checked)}
                />
                <label htmlFor="difficulty-scaling" className="text-sm text-ink cursor-pointer">
                  Enable difficulty scaling (adjust points based on completion rate)
                </label>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending}
              className="bg-brand hover:bg-brand/90 text-white rounded-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
