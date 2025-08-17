"use client"

import { DM_Serif_Display } from "next/font/google"
import { motion } from "framer-motion"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Leaf, Sparkles, Menu, User } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { useState } from "react"
import Link from "next/link"

const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400" })

const navLinks = [
  { href: "/missions", label: "Missions" },
  { href: "/goals", label: "Goals" },
  { href: "/categories", label: "Categories" },
  { href: "/long-term", label: "Long-Term" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
]

export default function Header() {
  const { user } = useSupabaseUser()
  const supabase = getSupabaseBrowser()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "EM"
  const displayEmail = user?.email ? (user.email.length > 20 ? `${user.email.slice(0, 17)}...` : user.email) : ""

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success("Signed out successfully")
      router.push("/login")
    } catch (error) {
      toast.error("Failed to sign out")
      console.error("Sign out error:", error)
    }
  }

  const isActiveLink = (href: string) => {
    return pathname.startsWith(href)
  }

  const NavLinks = ({ mobile = false, onLinkClick }: { mobile?: boolean; onLinkClick?: () => void }) => (
    <nav className={`flex ${mobile ? "flex-col space-y-2" : "items-center gap-2"}`}>
      {navLinks.map((link) => {
        const isActive = isActiveLink(link.href)
        return (
          <Link key={link.href} href={link.href} onClick={onLinkClick}>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={`rounded-full transition-colors ${
                isActive ? "bg-brand text-white hover:bg-brand/90" : "text-ink hover:text-ink hover:bg-ink/5"
              } ${mobile ? "w-full justify-start" : ""}`}
            >
              {link.label}
            </Button>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-ink/10">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/missions">
          <motion.div
            className="flex items-center gap-2 cursor-pointer"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="inline-flex items-center justify-center size-8 rounded-xl bg-brand/10 text-brand">
              <Leaf className="size-4" />
            </div>
            <span className={`${dmSerif.className} text-xl text-brand tracking-tight`}>Empire</span>
            <Sparkles className="ml-1 size-3 text-brand/60" aria-hidden="true" />
            <span className="sr-only">Empire personal growth planner</span>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <NavLinks />

          {/* User Section */}
          <div className="flex items-center gap-3 ml-4">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <Avatar className="size-7 border border-ink/20">
                    <AvatarImage alt="User avatar" />
                    <AvatarFallback className="bg-brand/10 text-brand text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-ink/70 hidden lg:inline">{displayEmail}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-ink/70 hover:text-ink"
                  onClick={handleSignOut}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="rounded-full bg-brand hover:bg-brand/90 text-white"
                onClick={() => router.push("/login")}
              >
                Sign in
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full">
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-white border-ink/10">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="flex items-center gap-2 pb-4">
                  <div className="inline-flex items-center justify-center size-8 rounded-xl bg-brand/10 text-brand">
                    <Leaf className="size-4" />
                  </div>
                  <span className={`${dmSerif.className} text-xl text-brand tracking-tight`}>Empire</span>
                </div>

                <Separator className="mb-6" />

                {/* Mobile Navigation */}
                <div className="flex-1">
                  <NavLinks mobile onLinkClick={() => setMobileMenuOpen(false)} />
                </div>

                <Separator className="my-6" />

                {/* Mobile User Section */}
                <div className="space-y-4">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-sand/20">
                        <Avatar className="size-10 border border-ink/20">
                          <AvatarImage alt="User avatar" />
                          <AvatarFallback className="bg-brand/10 text-brand">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{user.email}</p>
                          <p className="text-xs text-ink/60">Signed in</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="w-full justify-start rounded-full text-ink/70 hover:text-ink"
                        onClick={() => {
                          handleSignOut()
                          setMobileMenuOpen(false)
                        }}
                      >
                        <User className="size-4 mr-2" />
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full rounded-full bg-brand hover:bg-brand/90 text-white"
                      onClick={() => {
                        router.push("/login")
                        setMobileMenuOpen(false)
                      }}
                    >
                      Sign in
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
