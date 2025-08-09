"use client"

import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export default function SignInCard() {
  const supabase = getSupabaseBrowser()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!email) return
            const { error } = await supabase.auth.signInWithOtp({
              email,
              options: { emailRedirectTo: window.location.href },
            })
            if (!error) setSent(true)
          }}
          className="grid gap-2"
        >
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="rounded-full">
            Send magic link
          </Button>
        </form>
        <div className="text-xs text-muted-foreground">
          {sent ? "Check your inbox for a magic link." : "Or sign in with OAuth (e.g., GitHub) if configured."}
        </div>
        <Button
          variant="secondary"
          className="rounded-full"
          onClick={() => supabase.auth.signInWithOAuth({ provider: "github" })}
        >
          Continue with GitHub
        </Button>
      </CardContent>
    </Card>
  )
}
