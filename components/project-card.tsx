'use client'

import Link from 'next/link'
import { Star, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { DeployBadge } from './deploy-badge'
import type { Project } from '@/types'

function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function daysSince(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return '今天'
  if (days < 30) return `${days}天前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
}

export function ProjectCard({ project }: { project: Project }) {
  const slug = project.github_full_name.replace('/', '--')
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-base leading-tight">{project.display_name}</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            {formatStars(project.stars)}
          </div>
        </div>

        {project.description_zh && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {project.description_zh}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          <DeployBadge level={project.deploy_level} />
          {project.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            {daysSince(project.updated_at)}
          </span>
          <div className="flex gap-2">
            <Link href={`/project/${slug}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>详情</Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
