import { NextRequest } from 'next/server'
import { searchProjects, getPublishedProjects } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  const industryId = searchParams.get('industry') || undefined

  const projects = q
    ? await searchProjects(q, { industryId, limit: 30 })
    : await getPublishedProjects({ industryId, limit: 30 })

  return Response.json({ projects, query: q ?? '' })
}
