export const runtime = 'edge'

import { notFound } from 'next/navigation'
import { Star, ExternalLink, GitBranch } from 'lucide-react'
import { getCloudflareEnv } from '@/lib/cloudflare'
import { getProjectBySlug, getAllPublishedSlugs } from '@/lib/db'
import { DeployBadge } from '@/components/deploy-badge'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function generateStaticParams() {
  try {
    const { DB } = getCloudflareEnv()
    const slugs = await getAllPublishedSlugs(DB)
    return slugs.map(slug => ({ slug }))
  } catch {
    return []
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { DB } = getCloudflareEnv()
  const project = await getProjectBySlug(DB, slug)
  if (!project) notFound()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{project.display_name}</h1>
            <DeployBadge level={project.deploy_level} />
          </div>
          {project.description_zh && (
            <p className="text-lg text-muted-foreground">{project.description_zh}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {project.stars.toLocaleString()}
            </span>
            {project.language && <span>📝 {project.language}</span>}
            {project.license && <span>📄 {project.license}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={project.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            <GitBranch className="w-4 h-4 mr-2" />GitHub
          </a>
          {project.homepage && (
            <a
              href={project.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'default' })}
            >
              <ExternalLink className="w-4 h-4 mr-2" />官网
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {project.target_users.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">👤 适合谁用</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {project.target_users.map(u => <Badge key={u} variant="secondary">{u}</Badge>)}
              </div>
            </CardContent>
          </Card>
        )}

        {project.features.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">✨ 核心功能</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {project.features.map(f => <li key={f} className="flex gap-2"><span>•</span>{f}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        {project.use_cases.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">🎯 使用场景</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {project.use_cases.map(u => <li key={u} className="flex gap-2"><span>•</span>{u}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        {project.alternative_to.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">🔄 开源替代</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {project.alternative_to.map(a => (
                  <Badge key={a} variant="outline">替代 {a}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {project.deploy_command && (
        <Card>
          <CardHeader><CardTitle className="text-base">🚀 部署方式</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <pre className="whitespace-pre-wrap">{project.deploy_command}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {project.screenshots.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">界面截图</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {project.screenshots.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`${project.display_name} screenshot ${i + 1}`}
                className="rounded-lg border w-full object-cover" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
