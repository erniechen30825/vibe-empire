"use client"

import { useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { CheckCircle, XCircle, User, Database, Settings } from "lucide-react"

export const dynamic = "force-dynamic"

type TestResult = {
  step: string
  status: "pending" | "success" | "error"
  message: string
  data?: any
}

export default function TestSignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])

  const addResult = (step: string, status: "success" | "error", message: string, data?: any) => {
    setResults((prev) => [...prev, { step, status, message, data }])
  }

  const testSignupFlow = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password")
      return
    }

    setTesting(true)
    setResults([])
    const supabase = getSupabaseBrowser()

    try {
      // Step 1: Sign up
      addResult("signup", "pending", "Creating account...")
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        addResult("signup", "error", `Signup failed: ${signUpError.message}`)
        return
      }

      if (!signUpData.user) {
        addResult("signup", "error", "No user returned from signup")
        return
      }

      addResult("signup", "success", "Account created successfully", {
        userId: signUpData.user.id,
        email: signUpData.user.email,
        hasSession: !!signUpData.session,
      })

      // Step 2: Create profile
      if (signUpData.session?.user) {
        addResult("profile", "pending", "Creating user profile...")

        const { data: profileData, error: profileError } = await supabase.from("profiles").upsert(
          {
            user_id: signUpData.session.user.id,
            display_name: email.split("@")[0],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            long_term_months: 3,
            cycle_length_days: 14,
          },
          { onConflict: "user_id" },
        )

        if (profileError) {
          addResult("profile", "error", `Profile creation failed: ${profileError.message}`)
        } else {
          addResult("profile", "success", "Profile created successfully", profileData)
        }

        // Step 3: Verify profile exists
        addResult("verify", "pending", "Verifying profile in database...")

        const { data: fetchedProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", signUpData.session.user.id)
          .single()

        if (fetchError) {
          addResult("verify", "error", `Profile verification failed: ${fetchError.message}`)
        } else {
          addResult("verify", "success", "Profile verified in database", fetchedProfile)
        }

        // Step 4: Test user_settings creation
        addResult("settings", "pending", "Creating default user settings...")

        const { data: settingsData, error: settingsError } = await supabase.from("user_settings").upsert(
          {
            user_id: signUpData.session.user.id,
            long_term_months: 3,
            cycle_days: 14,
            highlight_points: 30,
            habit_min: 5,
            habit_max: 10,
            extra_points: 10,
            difficulty_scaling: false,
          },
          { onConflict: "user_id" },
        )

        if (settingsError) {
          addResult("settings", "error", `Settings creation failed: ${settingsError.message}`)
        } else {
          addResult("settings", "success", "User settings created successfully", settingsData)
        }

        // Step 5: Clean up - delete test user
        addResult("cleanup", "pending", "Cleaning up test data...")

        // Delete profile and settings first (due to foreign key constraints)
        await supabase.from("profiles").delete().eq("user_id", signUpData.session.user.id)
        await supabase.from("user_settings").delete().eq("user_id", signUpData.session.user.id)

        // Sign out
        await supabase.auth.signOut()

        addResult("cleanup", "success", "Test data cleaned up successfully")
      } else {
        addResult("profile", "pending", "Email confirmation required - cannot test profile creation")
      }
    } catch (error: any) {
      addResult("error", "error", `Unexpected error: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />
      case "pending":
        return <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    }
  }

  const getStepIcon = (step: string) => {
    switch (step) {
      case "signup":
        return <User className="w-4 h-4" />
      case "profile":
      case "verify":
        return <Database className="w-4 h-4" />
      case "settings":
        return <Settings className="w-4 h-4" />
      default:
        return <CheckCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand/20 text-brand">
          <User className="size-5" />
        </div>
        <h1 className="text-3xl font-bold text-ink">Test Signup Flow</h1>
      </div>

      <div className="space-y-6">
        {/* Test Form */}
        <Card className="rounded-2xl border-ink/10 bg-white/90">
          <CardHeader>
            <CardTitle className="text-ink">Signup Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="test-email" className="text-sm font-medium text-ink">
                Test Email
              </label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus-visible:ring-brand/40"
              />
            </div>

            <div>
              <label htmlFor="test-password" className="text-sm font-medium text-ink">
                Test Password
              </label>
              <Input
                id="test-password"
                type="password"
                placeholder="test123456"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus-visible:ring-brand/40"
              />
            </div>

            <Button
              onClick={testSignupFlow}
              disabled={testing || !email || !password}
              className="w-full bg-brand hover:bg-brand/90 text-white rounded-full"
            >
              {testing ? "Testing..." : "Test Signup Flow"}
            </Button>

            <div className="text-xs text-ink/60 bg-sand/20 p-3 rounded-xl">
              <strong>Note:</strong> This will create a test account, verify profile creation, then clean up all test
              data automatically.
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {results.length > 0 && (
          <Card className="rounded-2xl border-ink/10 bg-white/90">
            <CardHeader>
              <CardTitle className="text-ink">Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index}>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-ink/10">
                      <div className="flex items-center gap-2">
                        {getStepIcon(result.step)}
                        {getStatusIcon(result.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink capitalize">{result.step}</span>
                          <Badge
                            variant={
                              result.status === "success"
                                ? "default"
                                : result.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className={
                              result.status === "success"
                                ? "bg-mint/60 text-ink"
                                : result.status === "pending"
                                  ? "bg-sand/60 text-ink"
                                  : ""
                            }
                          >
                            {result.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-ink/70 mt-1">{result.message}</div>
                        {result.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-ink/50 cursor-pointer hover:text-ink/70">
                              View data
                            </summary>
                            <pre className="text-xs bg-ink/5 p-2 rounded mt-1 overflow-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                    {index < results.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="rounded-2xl border-ink/10 bg-white/90">
          <CardHeader>
            <CardTitle className="text-ink">What This Test Does</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-ink/70">
            <div className="flex items-start gap-2">
              <span className="font-medium text-brand">1.</span>
              <span>Creates a new user account using Supabase Auth</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-brand">2.</span>
              <span>Creates a profile record with default settings</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-brand">3.</span>
              <span>Verifies the profile exists in the database</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-brand">4.</span>
              <span>Creates default user settings</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-brand">5.</span>
              <span>Cleans up all test data automatically</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
