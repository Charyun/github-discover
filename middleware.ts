import { COOKIE_NAME } from '@/lib/auth'

export function middleware(req: NextRequest) {
  // Skip auth check for login page and login API to avoid redirect loops
  if (req.nextUrl.pathname === '/admin/login' || req.nextUrl.pathname === '/api/admin/login') {
    return NextResponse.next()
  }
  if (!checkRequestAuth(req)) {
    console.log('[middleware] auth fail', {
      path: req.nextUrl.pathname,
      cookieValue: req.cookies.get(COOKIE_NAME)?.value,
      adminSecret: process.env.ADMIN_SECRET,
      allCookies: req.cookies.getAll().map(c => `${c.name}=${c.value.slice(0, 10)}`),
    })
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
