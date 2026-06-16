export const dynamic = 'force-dynamic'

import type { MetadataRoute } from 'next'
import { getAllPublishedSlugs, getIndustries } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://openhub.pages.dev'

  let slugs: string[] = []
  let industries: { id: string }[] = []

  try {
    const [s, i] = await Promise.all([getAllPublishedSlugs(), getIndustries()])
    slugs = s
    industries = i
  } catch {
    // build-time: DB not available
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  ]

  const industryPages: MetadataRoute.Sitemap = industries.map(i => ({
    url: `${BASE}/${i.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const projectPages: MetadataRoute.Sitemap = slugs.map(slug => ({
    url: `${BASE}/project/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...industryPages, ...projectPages]
}
