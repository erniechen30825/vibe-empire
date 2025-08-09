import { NextResponse, type NextRequest } from "next/server"

// Minimal cookie-based auth detection. This works best if Supabase auth cookies are present
// (e.g., when using auth helpers). Otherwise, consider adding Supabase Auth Helpers.
function hasSupabaseAuthCookie(req: NextRequest) {
  const cookies = req.cookies.getAll()
  // Look for any Supabase-auth-related cookie names
  return cookies.some((c) => /sb|supabase/i.test(c.name) && !!c.value)
}

const PUBLIC_PATHS = [/^\/login$/, /^\/signup$/, /^\/api\/?.*/, /^\/_next\/.*/, /^\/public\/?.*/, /^\/favicon\.ico$/]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((re) => re.test(pathname))
  const isAuthed = hasSupabaseAuthCookie(req)

  // If not authed and trying to access a non-public route, redirect to /login
  if (!isAuthed && !isPublic) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // If authed and trying to access /login or /signup, redirect to /missions
  if (isAuthed && (pathname === "/login" || pathname === "/signup")) {
    const url = req.nextUrl.clone()
    url.pathname = "/missions"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Match everything except static assets; adjust as needed
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|css|js)).*)"],
}
