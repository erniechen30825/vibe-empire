import { NextResponse, type NextRequest } from "next/server"

// Minimal cookie-based Supabase auth detection.
// If you later add Supabase Auth Helpers, cookie names will be present automatically.
function hasSupabaseAuthCookie(req: NextRequest) {
  const cookies = req.cookies.getAll()
  return cookies.some((c) => /sb|supabase/i.test(c.name) && !!c.value)
}

const PUBLIC_PATHS = [/^\/login$/, /^\/signup$/, /^\/api\/?.*/, /^\/_next\/.*/, /^\/public\/?.*/, /^\/favicon\.ico$/]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((re) => re.test(pathname))
  const isAuthed = hasSupabaseAuthCookie(req)

  // Unauthed trying to access non-public -> /login
  if (!isAuthed && !isPublic) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // Authed visiting /login or /signup -> /missions
  if (isAuthed && (pathname === "/login" || pathname === "/signup")) {
    const url = req.nextUrl.clone()
    url.pathname = "/missions"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Avoid intercepting static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|css|js)).*)"],
}
