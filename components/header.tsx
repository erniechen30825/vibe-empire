"use client"

import { DM_Serif_Display } from "next/font/google"
import { motion } from "framer-motion"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Leaf, Sparkles } from "lucide-react"

const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400" })

export default function Header() {
  const { user } = useSupabaseUser()
  const supabase = getSupabaseBrowser()

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "EM"

  return (
    <header className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="inline-flex items-center justify-center size-9 rounded-xl bg-emerald-100 text-emerald-700">
            <Leaf className="size-5" />
          </div>
          <span className={`${dmSerif.className} text-xl sm:text-2xl tracking-tight`}>Empire</span>
          <Sparkles className="ml-1 size-4 text-emerald-500" aria-hidden="true" />
          <span className="sr-only">{"Empire personal growth planner"}</span>
        </motion.div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Avatar className="border-2 border-emerald-200">
                <AvatarImage alt="User avatar" />
                <AvatarFallback className="bg-emerald-50 text-emerald-700">{initials}</AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={async () => {
                  await supabase.auth.signOut()
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={async () => {
                // This will open the hosted auth page if OAuth providers are configured in Supabase
                await supabase.auth.signInWithOAuth({ provider: "github" })
              }}
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
