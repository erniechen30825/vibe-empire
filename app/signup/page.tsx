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
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setLoading(false)
      toast.error("Sign up failed", { description: error.message })
      return
    }

    // Try to sign in immediately after sign up (in case email confirmation is disabled)
    const { error: signInErr, data: signInData } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInErr) {
      // Account created but sign-in required via email confirmation
      toast.success("Account created", { description: "Please check your email to confirm your account." })
      router.replace("/login")
      return
    }

    if (signInData?.session) {
      toast.success("Account created", { description: "Welcome! Redirecting to your missions..." })
      router.replace("/missions")
      return
    }

    // Fallback redirect
    toast("Account created", { description: "Redirecting..." })
    router.replace("/missions")
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-emerald-50/50 to-white">
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto w-full max-w-md">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Create account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="grid gap-3">
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="mt-2 rounded-full bg-brand text-white hover:bg-brand/90"
                  disabled={loading}
                  aria-disabled={loading}
                >
                  {loading ? "Creating..." : "Create account"}
                </Button>
              </form>
              <div className="mt-4 text-sm text-muted-foreground">
                {"Already have an account? "}
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
