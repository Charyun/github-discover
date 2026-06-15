export const runtime = 'edge'

import { NextRequest } from 'next/server'
import { getCloudflareEnv } from '@/lib/cloudflare'
import { searchProjects, getPublishedProjects } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  const industryId = searchParams.get('industry') || undefined

  const { DB } = getCloudflareEnv()

  const projects = q
    ? await searchProjects(DB, q, { industryId, limit: 30 })
    : await getPublishedProjects(DB, { industryId, limit: 30 })

  return Response.json({ projects, query: q ?? '' })
}
