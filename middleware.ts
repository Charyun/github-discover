import { NextRequest, NextResponse } from 'next/server'
import { checkRequestAuth } from '@/lib/auth'

export function middleware(req: NextRequest) {
  if (!checkRequestAuth(req)) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
