"use client"

import type React from "react"

import { useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Eye, EyeOff, AlertCircle } from "lucide-react"

interface AuthFormProps {
  mode: "login" | "signup"
  onSuccess: () => void
}

export function AuthForm({ mode, onSuccess }: AuthFormProps) {
  const supabase = getSupabaseBrowser()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!password) {
      newErrors.password = "Password is required"
    } else if (mode === "signup" && password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password })

        if (error) throw error

        if (data.session?.user) {
          // Create profile
          await supabase.from("profiles").upsert(
            {
              user_id: data.session.user.id,
              display_name: email.split("@")[0],
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            { onConflict: "user_id" },
          )

          toast.success("Account created successfully!")
          onSuccess()
        } else {
          toast.success("Please check your email to confirm your account")
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) throw error

        if (data.session) {
          toast.success("Welcome back!")
          onSuccess()
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred"
      setErrors({ general: errorMessage })
      toast.error(mode === "signup" ? "Sign up failed" : "Sign in failed", {
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-sm border-ink/10">
      <CardHeader>
        <CardTitle className="text-2xl text-ink">{mode === "signup" ? "Create account" : "Sign in"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              className={`focus-visible:ring-brand/40 ${errors.email ? "border-red-500" : ""}`}
              required
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
          </div>

          <div className="grid gap-2">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                }}
                className={`focus-visible:ring-brand/40 pr-10 ${errors.password ? "border-red-500" : ""}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
            {mode === "signup" && password && (
              <div className="text-xs text-ink/60">
                Password strength: {password.length < 6 ? "Weak" : password.length < 10 ? "Good" : "Strong"}
              </div>
            )}
          </div>

          <div className="mt-2 flex justify-center">
            <Button type="submit" className="rounded-full bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading
                ? mode === "signup"
                  ? "Creating account..."
                  : "Signing in..."
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
