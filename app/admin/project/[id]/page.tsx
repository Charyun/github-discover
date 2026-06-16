export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getIndustries, getPendingProject, getAllScenes } from '@/lib/db'
import { ApproveForm } from './approve-form'

export default async function AdminProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const githubFullName = decodeURIComponent(id)

  const [industries, pending, scenes] = await Promise.all([
    getIndustries(),
    getPendingProject(githubFullName),
    getAllScenes(),
  ])

  if (!pending) notFound()

  const raw = (pending.raw_data ?? {}) as Record<string, unknown>

  const initialData = {
    display_name: (raw.name as string) ?? '',
    description_zh: '',
    homepage: (raw.homepage as string) ?? '',
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">← 返回队列</Link>
        <h1 className="text-2xl font-bold mt-2">{githubFullName}</h1>
        <p className="text-sm text-muted-foreground">自动评分: {pending.auto_score} / 100</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ApproveForm
          githubFullName={githubFullName}
          initialData={initialData}
          industries={industries}
          scenes={scenes}
          mode="approve"
        />
        <div>
          <p className="text-sm font-medium mb-2">GitHub 链接</p>
          <a
            href={`https://github.com/${githubFullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            https://github.com/{githubFullName} ↗
          </a>
          <p className="text-xs text-muted-foreground mt-4">原始数据</p>
          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-64">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
