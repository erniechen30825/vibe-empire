"use client"

import { useQuery } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy } from "lucide-react"
import { motion } from "framer-motion"

type EmpireLevel = {
  user_id: string
  total_points: number
  level: number
}

export default function PointsLevel() {
  const { user } = useSupabaseUser()
  const { data } = useQuery({
    queryKey: ["empire-level", user?.id],
    queryFn: async () => {
      if (!user) return null
      const supabase = getSupabaseBrowser()
      const { data, error } = await supabase
        .from("empire_levels")
        .select("user_id,total_points,level")
        .eq("user_id", user.id)
        .maybeSingle()
      if (error) throw error
      return (data as EmpireLevel | null) ?? { user_id: user.id, total_points: 0, level: 1 }
    },
    enabled: !!user,
  })

  const total = data?.total_points ?? 0
  const level = data?.level ?? 1
  // Simple illustrative next-level target: 100 pts per level
  const nextTarget = level * 100
  const progress = Math.min(100, Math.round(((total % nextTarget) / nextTarget) * 100))

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center size-9 rounded-xl bg-emerald-100 text-emerald-700">
              <Trophy className="size-5" />
            </div>
            <div className="text-sm text-muted-foreground">{"Your Level"}</div>
          </div>
          <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
            Lv. {level}
          </Badge>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold tabular-nums">{total} pts</div>
            <div className="text-xs text-muted-foreground">{"Keep growing. Small steps matter."}</div>
          </div>
          <div className="text-xs text-muted-foreground">{progress}%</div>
        </div>
        <motion.div
          className="mt-3"
          initial={{ scaleX: 0.98, opacity: 0.4 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Progress value={progress} className="h-2 bg-emerald-100 [&>div]:bg-emerald-500" />
        </motion.div>
      </CardContent>
    </Card>
  )
}
