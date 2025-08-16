"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function LoginPage() {
  const supabase = getSupabaseBrowser()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if already signed in
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        router.replace("/missions")
      }
    }
    checkSession()
  }, [router, supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("Sign in failed", { description: error.message })
        return
      }

      if (data.session) {
        toast.success("Welcome back!", { description: "Redirecting to your missions..." })
        router.replace("/missions")
      }
    } catch (error: any) {
      toast.error("Sign in failed", { description: error.message })
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
              <CardTitle className="text-2xl text-ink">Sign in</CardTitle>
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus-visible:ring-brand/40"
                    required
                  />
                </div>

                <div className="mt-2 flex justify-center">
                  <Button type="submit" className="rounded-full bg-mint hover:bg-mint/80 text-ink" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </form>

              <div className="mt-4 text-center text-sm text-ink/70">
                Don't have an account?{" "}
                <Link className="text-brand underline-offset-4 hover:underline" href="/signup">
                  Create one
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
