import { NextRequest, NextResponse } from 'next/server'
import { checkRequestAuth } from '@/lib/auth'

export function middleware(req: NextRequest) {
  // Skip auth check for login page and login API to avoid redirect loops
  if (req.nextUrl.pathname === '/admin/login' || req.nextUrl.pathname === '/api/admin/login') {
    return NextResponse.next()
  }
  if (!checkRequestAuth(req)) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
