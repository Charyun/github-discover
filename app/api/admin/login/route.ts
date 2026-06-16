import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password?: string }
  const cfEnv = getCloudflareContext().env as unknown as Record<string, string>
  const adminPassword = cfEnv.ADMIN_PASSWORD
  const adminSecret = cfEnv.ADMIN_SECRET

  if (!adminPassword || !adminSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_session', adminSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
