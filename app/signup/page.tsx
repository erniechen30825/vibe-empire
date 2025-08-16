"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function SignupPage() {
  const supabase = getSupabaseBrowser()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)

    try {
      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        toast.error("Sign up failed", { description: signUpError.message })
        return
      }

      // If we have a session immediately (email confirmation disabled)
      if (signUpData.session?.user) {
        // Create profile entry
        const { error: profileError } = await supabase.from("profiles").upsert(
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
          console.warn("Profile creation failed:", profileError)
        }

        toast.success("Account created!", { description: "Welcome to Empire!" })
        router.replace("/missions")
      } else {
        // Email confirmation required
        toast.success("Account created", {
          description: "Check your inbox to confirm your email address.",
        })
        router.replace("/login")
      }
    } catch (error: any) {
      toast.error("Sign up failed", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-emerald-50/50 to-white">
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto w-full max-w-md">
          <Card className="rounded-2xl shadow-sm border-ink/10">
            <CardHeader>
              <CardTitle className="text-2xl text-ink">Create account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium text-ink">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus-visible:ring-brand/40"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm font-medium text-ink">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus-visible:ring-brand/40"
                    required
                  />
                </div>

                <div className="mt-2 flex justify-center">
                  <Button
                    type="submit"
                    className="rounded-full bg-brand text-white hover:bg-brand/90"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create account"}
                  </Button>
                </div>
              </form>

              <div className="mt-4 text-center text-sm text-ink/70">
                Already have an account?{" "}
                <Link className="text-brand underline-offset-4 hover:underline" href="/login">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
