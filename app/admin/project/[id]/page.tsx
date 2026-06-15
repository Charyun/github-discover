export const runtime = 'edge'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCloudflareEnv } from '@/lib/cloudflare'
import { getIndustries } from '@/lib/db'
import { ApproveForm } from './approve-form'

export default async function AdminProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const githubFullName = decodeURIComponent(id)
  const { DB } = getCloudflareEnv()

  const [industries, pending, scenesResult] = await Promise.all([
    getIndustries(DB),
    DB.prepare("SELECT * FROM pending_queue WHERE github_full_name = ?")
      .bind(githubFullName)
      .first<{ github_full_name: string; raw_data: string; auto_score: number }>(),
    DB.prepare('SELECT * FROM scenes').all<{ id: string; industry_id: string; name_zh: string }>(),
  ])

  if (!pending) notFound()

  const scenes = scenesResult.results

  let raw: Record<string, unknown> = {}
  try { raw = JSON.parse(pending.raw_data) } catch {}

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
