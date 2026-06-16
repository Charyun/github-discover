export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getIndustries, getScenesByIndustry, getPublishedProjects } from '@/lib/db'
import { ProjectCard } from '@/components/project-card'
import { Badge } from '@/components/ui/badge'
import { SiteShell } from '@/components/site-shell'

export default async function ScenePage({
  params,
}: {
  params: Promise<{ industry: string; scene: string }>
}) {
  const { industry: industryId, scene: sceneId } = await params
  const [industries, scenes, projects] = await Promise.all([
    getIndustries(),
    getScenesByIndustry(industryId),
    getPublishedProjects({ industryId, sceneId, limit: 40 }),
  ])

  const industry = industries.find(i => i.id === industryId)
  const scene = scenes.find(s => s.id === sceneId)
  if (!industry || !scene) notFound()

  return (
    <SiteShell>
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
    </SiteShell>
  )
}
