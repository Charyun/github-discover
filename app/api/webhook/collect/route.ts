import { NextRequest, NextResponse } from 'next/server'
import { upsertPendingProjects } from '@/lib/db'
import { verifyHmacSha256 } from '@/lib/hmac'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('x-webhook-signature') ?? ''
  const secret = process.env.WEBHOOK_SECRET ?? ''

  const valid = await verifyHmacSha256(secret, body, sig)
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = JSON.parse(body) as {
    items: Array<{
      github_full_name: string
      raw_data: string  // JSON-serialized from collect.py
      auto_score: number
      collected_at: string
    }>
  }
  const { items } = payload
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 })
  }

  // Normalize wire format: raw_data is a JSON string on the wire, but stored as JSONB.
  const normalized = items.map(i => ({
    github_full_name: i.github_full_name,
    raw_data: JSON.parse(i.raw_data) as Record<string, unknown>,
    auto_score: i.auto_score,
    collected_at: i.collected_at,
    status: 'pending' as const,
  }))

  await upsertPendingProjects(normalized)

  return NextResponse.json({ ok: true, inserted: items.length })
}
