'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Industry, Scene } from '@/types'

interface FormData {
  display_name: string
  description_zh: string
  industry_id: string
  scene_id: string
  tags: string
  target_users: string
  use_cases: string
  features: string
  alternative_to: string
  deploy_level: string
  deploy_command: string
  homepage: string
}

interface Props {
  githubFullName: string
  initialData: Partial<FormData>
  industries: Industry[]
  scenes: Scene[]
  mode: 'approve' | 'edit'
}

export function ApproveForm({ githubFullName, initialData, industries, scenes, mode }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    display_name: initialData.display_name ?? '',
    description_zh: initialData.description_zh ?? '',
    industry_id: initialData.industry_id ?? '',
    scene_id: initialData.scene_id ?? '',
    tags: initialData.tags ?? '',
    target_users: initialData.target_users ?? '',
    use_cases: initialData.use_cases ?? '',
    features: initialData.features ?? '',
    alternative_to: initialData.alternative_to ?? '',
    deploy_level: initialData.deploy_level ?? '',
    deploy_command: initialData.deploy_command ?? '',
    homepage: initialData.homepage ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filteredScenes = scenes.filter(s => s.industry_id === form.industry_id)

  function parseCommaSeparated(val: string): string[] {
    return val.split(',').map(s => s.trim()).filter(Boolean)
  }

  async function handleApprove() {
    setLoading(true)
    setError('')
    try {
      const payload = {
        github_full_name: githubFullName,
        display_name: form.display_name,
        description_zh: form.description_zh,
        industry_id: form.industry_id,
        scene_id: form.scene_id || null,
        tags: parseCommaSeparated(form.tags),
        target_users: parseCommaSeparated(form.target_users),
        use_cases: parseCommaSeparated(form.use_cases),
        features: parseCommaSeparated(form.features),
        alternative_to: parseCommaSeparated(form.alternative_to),
        deploy_level: form.deploy_level || null,
        deploy_command: form.deploy_command || null,
        homepage: form.homepage || null,
      }
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push('/admin')
      router.refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!confirm(`确认拒绝 ${githubFullName}？`)) return
    setLoading(true)
    try {
      await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_full_name: githubFullName }),
      })
      router.push('/admin')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function field(id: keyof FormData, label: string, hint?: string) {
    return (
      <div className="space-y-1">
        <Label htmlFor={id}>
          {label}
          {hint && <span className="text-xs text-muted-foreground ml-1">{hint}</span>}
        </Label>
        {id === 'description_zh' || id === 'deploy_command' ? (
          <Textarea id={id} value={form[id]} rows={3}
            onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))} />
        ) : (
          <Input id={id} value={form[id]}
            onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {field('display_name', '显示名称')}
      {field('description_zh', '中文描述')}

      <div className="space-y-1">
        <Label>行业</Label>
        <Select value={form.industry_id} onValueChange={v => setForm(f => ({ ...f, industry_id: v, scene_id: '' } as FormData))}>
          <SelectTrigger><SelectValue placeholder="选择行业" /></SelectTrigger>
          <SelectContent>
            {industries.map(i => <SelectItem key={i.id} value={i.id}>{i.icon} {i.name_zh}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filteredScenes.length > 0 && (
        <div className="space-y-1">
          <Label>场景</Label>
          <Select value={form.scene_id} onValueChange={v => setForm(f => ({ ...f, scene_id: v } as FormData))}>
            <SelectTrigger><SelectValue placeholder="选择场景（可选）" /></SelectTrigger>
            <SelectContent>
              {filteredScenes.map(s => <SelectItem key={s.id} value={s.id}>{s.name_zh}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {field('tags', '标签', '（逗号分隔，如：团队协作,看板）')}
      {field('target_users', '适用人群', '（逗号分隔）')}
      {field('features', '核心功能', '（逗号分隔）')}
      {field('use_cases', '使用场景', '（逗号分隔）')}
      {field('alternative_to', '替代商业软件', '（逗号分隔）')}

      <div className="space-y-1">
        <Label>部署层级</Label>
        <Select value={form.deploy_level} onValueChange={v => setForm(f => ({ ...f, deploy_level: v } as FormData))}>
          <SelectTrigger><SelectValue placeholder="选择部署难度" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="L1">L1 — 直接下载</SelectItem>
            <SelectItem value="L2">L2 — Docker</SelectItem>
            <SelectItem value="L3">L3 — 脚本安装</SelectItem>
            <SelectItem value="L4">L4 — 打包运行</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {field('deploy_command', '部署命令', '（docker run 命令或下载链接）')}
      {field('homepage', '官网地址')}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleApprove}
          disabled={loading || !form.display_name || !form.industry_id}
        >
          {loading ? '处理中...' : '✅ 通过发布'}
        </Button>
        {mode === 'approve' && (
          <Button variant="destructive" onClick={handleReject} disabled={loading}>
            ❌ 拒绝
          </Button>
        )}
      </div>
    </div>
  )
}
