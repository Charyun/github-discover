export const dynamic = 'force-dynamic'

import { getIndustries, getTopProjects, getRecentProjects } from '@/lib/db'
import { IndustryGrid } from '@/components/industry-grid'
import { ProjectCard } from '@/components/project-card'
import { SiteShell } from '@/components/site-shell'

export default async function HomePage() {
  const [industries, topProjects, recentProjects] = await Promise.all([
    getIndustries(),
    getTopProjects(8),
    getRecentProjects(7, 6),
  ])

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-8 space-y-12">
        <section className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold">发现优质开源工具</h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            按行业场景聚合 GitHub 精选项目，用中文解读，让每个人都能用上好工具
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">按行业浏览</h2>
          <IndustryGrid industries={industries} />
        </section>

        {topProjects.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">热门推荐</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {topProjects.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          </section>
        )}

        {recentProjects.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">近期新增</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          </section>
        )}
      </div>
    </SiteShell>
  )
}
