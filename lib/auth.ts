import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60

function getCfSecret(key: string): string {
  try {
    const env = getCloudflareContext().env as unknown as Record<string, string>
    return env[key] ?? ''
  } catch {
    return process.env[key] ?? ''
  }
}

export function getAdminSecret(): string {
  const secret = getCfSecret('ADMIN_SECRET')
  if (!secret) throw new Error('ADMIN_SECRET env var not set')
  return secret
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)?.value
  return session === getAdminSecret()
}

export function createSessionCookie(secret: string): NextResponse {
  const res = NextResponse.redirect('/')
  res.cookies.set(COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return res
}

export function checkRequestAuth(req: NextRequest): boolean {
  const session = req.cookies.get(COOKIE_NAME)?.value
  const secret = getCfSecret('ADMIN_SECRET')
  return !!secret && session === secret
}
