export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getPendingQueue } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default async function AdminPage() {
  const queue = await getPendingQueue(50)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">待审核项目</h1>
        <Badge variant="secondary">{queue.length} 个待处理</Badge>
      </div>

      {queue.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">暂无待审核项目</CardContent></Card>
      )}

      <div className="space-y-2">
        {queue.map(item => {
          const raw = (item.raw_data ?? {}) as { name?: string; stargazers_count?: number; language?: string }
          return (
            <Card key={item.github_full_name}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.github_full_name}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span>⭐ {raw.stargazers_count?.toLocaleString() ?? '?'}</span>
                    {raw.language && <span>📝 {raw.language}</span>}
                    <span>评分 {item.auto_score}</span>
                    <span>{item.collected_at.slice(0, 10)}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/admin/project/${encodeURIComponent(item.github_full_name)}`}
                    className={buttonVariants({ size: 'sm' })}
                  >
                    审核
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
