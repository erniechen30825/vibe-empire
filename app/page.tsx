"use client"

import { Suspense } from "react"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import PointsLevel from "@/components/points-level"
import TodayMissions from "@/components/today-missions"
import BacklogTasks from "@/components/backlog-tasks"
import SignInCard from "@/components/sign-in-card"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DM_Serif_Display, Inter } from "next/font/google"

const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

function LoadingSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  )
}

function ErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Card className="rounded-2xl border-red-200">
      <CardContent className="p-6 text-center">
        <p className="text-red-600 mb-4">Something went wrong loading this section</p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          Try Again
        </button>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const { user, loading } = useSupabaseUser()

  if (loading) {
    return (
      <div className={`${inter.variable} ${dmSerif.variable} font-sans`}>
        <main className="min-h-dvh bg-gradient-to-b from-emerald-100/60 to-white">
          <div className="container mx-auto px-4 py-6 md:py-10 grid gap-6 md:gap-8">
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`${inter.variable} ${dmSerif.variable} font-sans`}>
        <main className="min-h-dvh bg-gradient-to-b from-emerald-100/60 to-white">
          <div className="container mx-auto px-4 py-6 md:py-10 flex items-center justify-center">
            <SignInCard />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={`${inter.variable} ${dmSerif.variable} font-sans`}>
      <main className="min-h-dvh bg-gradient-to-b from-emerald-100/60 to-white">
        <div className="container mx-auto px-4 py-6 md:py-10 grid gap-6 md:gap-8">
          <section aria-label="Level and Points">
            <Suspense fallback={<LoadingSkeleton />}>
              <PointsLevel />
            </Suspense>
          </section>

          <section aria-label="Today's Missions">
            <Suspense fallback={<LoadingSkeleton />}>
              <TodayMissions />
            </Suspense>
          </section>

          <section aria-label="Task Backlog">
            <Suspense fallback={<LoadingSkeleton />}>
              <BacklogTasks />
            </Suspense>
          </section>
        </div>
      </main>
    </div>
  )
}
