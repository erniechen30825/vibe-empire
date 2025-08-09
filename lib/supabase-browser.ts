"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let supabase: SupabaseClient | null = null

export function getSupabaseBrowser() {
  if (supabase) return supabase

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set Environment Variables in your Vercel project.",
    )
  }

  supabase = createClient(url ?? "", key ?? "", {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return supabase
}
