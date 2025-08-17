"use client"

import type React from "react"

import { lazy, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load heavy components
export const LazyGoalForm = lazy(() => import("@/components/goals/goal-form"))
export const LazyLongTermWizard = lazy(() => import("@/components/long-term/long-term-wizard"))

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function LazyWrapper({ children, fallback }: LazyWrapperProps) {
  return <Suspense fallback={fallback || <Skeleton className="h-96 w-full" />}>{children}</Suspense>
}
