import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let supabaseServer: SupabaseClient | null = null

export function getSupabaseServer() {
  if (supabaseServer) return supabaseServer

  const url = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on server. Set Environment Variables in Vercel.")
  }

  supabaseServer = createClient(url ?? "", serviceRole ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "empire-mvp/server" } },
  })
  return supabaseServer
}
