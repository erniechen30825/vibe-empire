import { NextResponse, type NextRequest } from "next/server"

// Optimistic cookie-only check:
// - Works when using Supabase Auth Helpers (which set cookies).
// - If you're only using supabase-js in the browser (localStorage), cookies won't exist,
//   so we must NOT enforce "unauthed -> /login" here to avoid loops.
function isAuthenticated(req: NextRequest) {
  const access = req.cookies.get("sb-access-token")?.value
  const refresh = req.cookies.get("sb-refresh-token")?.value
  const helper = req.cookies.get("supabase-auth-token")?.value
  return Boolean((access && refresh) || helper)
}

const AUTH_PAGES = new Set(["/login", "/signup"])

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const authed = isAuthenticated(req)

  // If already signed in, prevent access to /login or /signup
  if (authed && AUTH_PAGES.has(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = "/missions"
    url.search = ""
    return NextResponse.redirect(url)
  }

  // IMPORTANT:
  // We do NOT redirect unauthenticated users to /login here because
  // without helper cookies the auth state is unknown in Middleware.
  // The client-side guard on /login will redirect to /missions after sign-in.

  return NextResponse.next()
}

// Avoid intercepting static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|css|js)).*)"],
}
