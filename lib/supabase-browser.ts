"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let supabase: SupabaseClient | null = null

function createThrowingClient(message: string): SupabaseClient {
  // Throws on any property access, preventing accidental usage during SSR/build.
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(message)
    },
    apply() {
      throw new Error(message)
    },
  }) as unknown as SupabaseClient
}

export function getSupabaseBrowser(): SupabaseClient {
  if (supabase) return supabase

  // If this is called during SSR or at build time, do NOT construct a client.
  if (typeof window === "undefined") {
    return createThrowingClient(
      "Supabase browser client was accessed on the server. Avoid calling getSupabaseBrowser() during SSR/build.",
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Helpfully throw at runtime with a clear message, but don't crash builds.
    console.warn("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in your Vercel project.")
    return createThrowingClient(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set Environment Variables in your Vercel project.",
    )
  }

  supabase = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return supabase
}
