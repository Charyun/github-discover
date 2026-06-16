import { NextRequest, NextResponse } from 'next/server'
import { syncProjectStats } from '@/lib/db'
import { verifyHmacSha256 } from '@/lib/hmac'

interface StatUpdate {
  github_full_name: string
  stars: number
  updated_at: string
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('x-webhook-signature') ?? ''
  const secret = process.env.WEBHOOK_SECRET ?? ''

  const valid = await verifyHmacSha256(secret, body, sig)
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { updates } = JSON.parse(body) as { updates: StatUpdate[] }
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 })
  }

  await syncProjectStats(updates)

  return NextResponse.json({ ok: true, updated: updates.length })
}
