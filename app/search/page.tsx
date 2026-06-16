export const dynamic = 'force-dynamic'

import { searchProjects } from '@/lib/db'
import { ProjectCard } from '@/components/project-card'
import { SearchBar } from '@/components/search-bar'
import { SiteShell } from '@/components/site-shell'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const projects = query ? await searchProjects(query, { limit: 30 }) : []

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col items-center gap-4">
          <SearchBar defaultValue={query} />
          {query && (
            <p className="text-muted-foreground text-sm">
              搜索「{query}」，找到 {projects.length} 个结果
            </p>
          )}
        </div>

        {projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}

        {query && projects.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            没有找到相关工具，试试其他关键词？
          </div>
        )}
      </div>
    </SiteShell>
  )
}
