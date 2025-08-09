import { Suspense } from "react"
import { QueryProvider } from "@/components/query-provider"
import Header from "@/components/header"
import PointsLevel from "@/components/points-level"
import TodayMissions from "@/components/today-missions"
import BacklogTasks from "@/components/backlog-tasks"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DM_Serif_Display, Inter } from "next/font/google"

const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export default function Page() {
  return (
    <div className={`${inter.variable} ${dmSerif.variable} font-sans`}>
      <QueryProvider>
        <main className="min-h-dvh bg-gradient-to-b from-emerald-50 to-white">
          <Header />
          <div className="container mx-auto px-4 py-6 md:py-10 grid gap-6 md:gap-8">
            <section aria-label="Level and Points">
              <Suspense
                fallback={
                  <Card className="rounded-2xl">
                    <CardContent className="p-6">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                }
              >
                <PointsLevel />
              </Suspense>
            </section>

            <section aria-label="Today">
              <Suspense
                fallback={
                  <Card className="rounded-2xl">
                    <CardContent className="p-6 grid gap-3">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-10 w-48" />
                    </CardContent>
                  </Card>
                }
              >
                <TodayMissions />
              </Suspense>
            </section>

            <section aria-label="Backlog">
              <Suspense
                fallback={
                  <Card className="rounded-2xl">
                    <CardContent className="p-6 grid gap-3">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                }
              >
                <BacklogTasks />
              </Suspense>
            </section>
          </div>
        </main>
      </QueryProvider>
    </div>
  )
}
