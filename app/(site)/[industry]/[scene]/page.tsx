export const runtime = 'edge'
export const revalidate = 86400

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCloudflareEnv } from '@/lib/cloudflare'
import { getIndustries, getScenesByIndustry, getPublishedProjects } from '@/lib/db'
import { ProjectCard } from '@/components/project-card'
import { Badge } from '@/components/ui/badge'

export async function generateStaticParams() {
  return [
    { industry: 'life', scene: 'life-home' },
    { industry: 'life', scene: 'life-food' },
    { industry: 'life', scene: 'life-travel' },
    { industry: 'productivity', scene: 'prod-pm' },
    { industry: 'productivity', scene: 'prod-docs' },
    { industry: 'productivity', scene: 'prod-auto' },
    { industry: 'content', scene: 'content-video' },
    { industry: 'content', scene: 'content-design' },
    { industry: 'content', scene: 'content-audio' },
    { industry: 'content', scene: 'content-write' },
    { industry: 'business', scene: 'biz-ecom' },
    { industry: 'business', scene: 'biz-crm' },
    { industry: 'business', scene: 'biz-finance' },
    { industry: 'education', scene: 'edu-lang' },
    { industry: 'education', scene: 'edu-code' },
    { industry: 'education', scene: 'edu-km' },
    { industry: 'health', scene: 'health-fit' },
    { industry: 'health', scene: 'health-mental' },
    { industry: 'health', scene: 'health-chronic' },
    { industry: 'smarthome', scene: 'home-auto' },
    { industry: 'smarthome', scene: 'home-security' },
    { industry: 'smarthome', scene: 'home-energy' },
    { industry: 'gaming', scene: 'game-dev' },
    { industry: 'gaming', scene: 'game-sim' },
    { industry: 'gaming', scene: 'game-retro' },
  ]
}

export default async function ScenePage({
  params,
}: {
  params: Promise<{ industry: string; scene: string }>
}) {
  const { industry: industryId, scene: sceneId } = await params
  const { DB } = getCloudflareEnv()
  const [industries, scenes, projects] = await Promise.all([
    getIndustries(DB),
    getScenesByIndustry(DB, industryId),
    getPublishedProjects(DB, { industryId, sceneId, limit: 40 }),
  ])

  const industry = industries.find(i => i.id === industryId)
  const scene = scenes.find(s => s.id === sceneId)
  if (!industry || !scene) notFound()

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          <Link href={`/${industryId}`} className="hover:underline">{industry.name_zh}</Link>
          {' › '}
          {scene.name_zh}
        </p>
        <h1 className="text-3xl font-bold">{scene.name_zh}工具</h1>
        <p className="text-muted-foreground mt-1">共 {projects.length} 个精选工具</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/${industryId}`}>
          <Badge variant="outline">全部</Badge>
        </Link>
        {scenes.map(s => (
          <Link key={s.id} href={`/${industryId}/${s.id}`}>
            <Badge variant={s.id === sceneId ? 'default' : 'outline'}>{s.name_zh}</Badge>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => <ProjectCard key={p.id} project={p} />)}
      </div>
    </div>
  )
}
