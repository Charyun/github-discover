import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { approveProject } from '@/lib/db'
import type { Project } from '@/types'

export async function POST(req: NextRequest) {
  const data = await req.json() as Partial<Project> & { github_full_name: string }
  const { github_full_name, ...projectData } = data

  if (!github_full_name) {
    return NextResponse.json({ error: 'github_full_name required' }, { status: 400 })
  }

  await approveProject(github_full_name, projectData)

  const slug = github_full_name.replace('/', '--')
  revalidatePath(`/project/${slug}`)
  revalidatePath('/')
  if (projectData.industry_id) {
    revalidatePath(`/${projectData.industry_id}`)
  }

  return NextResponse.json({ ok: true, slug })
}
