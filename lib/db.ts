import type { D1Database } from '@cloudflare/workers-types'
import type { Industry, Scene, Project, ProjectRow, PendingProject } from '@/types'

function parseProject(row: ProjectRow): Project {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    screenshots: JSON.parse(row.screenshots || '[]'),
    alternative_to: JSON.parse(row.alternative_to || '[]'),
    target_users: JSON.parse(row.target_users || '[]'),
    use_cases: JSON.parse(row.use_cases || '[]'),
    features: JSON.parse(row.features || '[]'),
  }
}

export async function getIndustries(db: D1Database): Promise<Industry[]> {
  const { results } = await db
    .prepare('SELECT * FROM industries ORDER BY "order"')
    .all<Industry>()
  return results
}

export async function getScenesByIndustry(db: D1Database, industryId: string): Promise<Scene[]> {
  const { results } = await db
    .prepare('SELECT * FROM scenes WHERE industry_id = ?')
    .bind(industryId)
    .all<Scene>()
  return results
}

export async function getPublishedProjects(
  db: D1Database,
  opts: { industryId?: string; sceneId?: string; limit?: number; offset?: number } = {}
): Promise<Project[]> {
  const conditions = ["status = 'published'"]
  const bindings: unknown[] = []
  if (opts.industryId) { conditions.push('industry_id = ?'); bindings.push(opts.industryId) }
  if (opts.sceneId)    { conditions.push('scene_id = ?');    bindings.push(opts.sceneId) }
  bindings.push(opts.limit ?? 20)
  bindings.push(opts.offset ?? 0)

  const sql = `SELECT * FROM projects WHERE ${conditions.join(' AND ')} ORDER BY stars DESC LIMIT ? OFFSET ?`
  const { results } = await db.prepare(sql).bind(...bindings).all<ProjectRow>()
  return results.map(parseProject)
}

export async function getProjectBySlug(db: D1Database, slug: string): Promise<Project | null> {
  const row = await db
    .prepare("SELECT * FROM projects WHERE github_full_name = ? AND status = 'published'")
    .bind(slug.replace('--', '/'))
    .first<ProjectRow>()
  return row ? parseProject(row) : null
}

export async function getAllPublishedSlugs(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT github_full_name FROM projects WHERE status = 'published'")
    .all<{ github_full_name: string }>()
  return results.map(r => r.github_full_name.replace('/', '--'))
}

export async function searchProjects(
  db: D1Database,
  query: string,
  opts: { industryId?: string; limit?: number } = {}
): Promise<Project[]> {
  const bindings: unknown[] = [`${query}*`]
  let industryFilter = ''
  if (opts.industryId) {
    industryFilter = "AND p.industry_id = ?"
    bindings.push(opts.industryId)
  }
  bindings.push(opts.limit ?? 20)

  const sql = `
    SELECT p.* FROM projects p
    JOIN projects_fts fts ON p.rowid = fts.rowid
    WHERE projects_fts MATCH ? AND p.status = 'published'
    ${industryFilter}
    ORDER BY rank LIMIT ?
  `
  const { results } = await db.prepare(sql).bind(...bindings).all<ProjectRow>()
  return results.map(parseProject)
}

export async function getRecentProjects(db: D1Database, days: number, limit: number): Promise<Project[]> {
  const { results } = await db
    .prepare(`SELECT * FROM projects WHERE status = 'published' AND published_at >= date('now', '-${days} days') ORDER BY published_at DESC LIMIT ?`)
    .bind(limit)
    .all<ProjectRow>()
  return results.map(parseProject)
}

export async function getTopProjects(db: D1Database, limit: number): Promise<Project[]> {
  const { results } = await db
    .prepare("SELECT * FROM projects WHERE status = 'published' ORDER BY stars DESC LIMIT ?")
    .bind(limit)
    .all<ProjectRow>()
  return results.map(parseProject)
}

export async function getPendingQueue(db: D1Database, limit = 50): Promise<PendingProject[]> {
  const { results } = await db
    .prepare("SELECT * FROM pending_queue WHERE status = 'pending' ORDER BY auto_score DESC LIMIT ?")
    .bind(limit)
    .all<PendingProject>()
  return results
}

export async function upsertPendingProjects(db: D1Database, items: PendingProject[]): Promise<void> {
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO pending_queue (github_full_name, raw_data, auto_score, collected_at, status) VALUES (?, ?, ?, ?, ?)'
  )
  const batch = items.map(i => stmt.bind(i.github_full_name, i.raw_data, i.auto_score, i.collected_at, 'pending'))
  await db.batch(batch)
}

export async function approveProject(db: D1Database, githubFullName: string, data: Partial<Project>): Promise<void> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.batch([
    db.prepare(`
      INSERT INTO projects (id, github_full_name, display_name, description_zh, industry_id, scene_id,
        tags, stars, language, license, updated_at, deploy_level, deploy_difficulty, chinese_support,
        screenshots, alternative_to, target_users, use_cases, features, github_url, homepage,
        deploy_command, quality_score, status, created_at, published_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(github_full_name) DO UPDATE SET
        display_name=excluded.display_name, description_zh=excluded.description_zh,
        industry_id=excluded.industry_id, scene_id=excluded.scene_id,
        tags=excluded.tags, status='published', published_at=excluded.published_at
    `).bind(
      id, githubFullName, data.display_name ?? '', data.description_zh ?? null,
      data.industry_id ?? null, data.scene_id ?? null,
      JSON.stringify(data.tags ?? []), data.stars ?? 0, data.language ?? null, data.license ?? null,
      data.updated_at ?? now, data.deploy_level ?? null, data.deploy_difficulty ?? null,
      data.chinese_support ?? null, JSON.stringify(data.screenshots ?? []),
      JSON.stringify(data.alternative_to ?? []), JSON.stringify(data.target_users ?? []),
      JSON.stringify(data.use_cases ?? []), JSON.stringify(data.features ?? []),
      data.github_url ?? `https://github.com/${githubFullName}`,
      data.homepage ?? null, data.deploy_command ?? null,
      data.quality_score ?? 0, 'published', now, now
    ),
    db.prepare("UPDATE pending_queue SET status = 'approved' WHERE github_full_name = ?")
      .bind(githubFullName),
  ])
}

export async function rejectPendingProject(db: D1Database, githubFullName: string): Promise<void> {
  await db
    .prepare("UPDATE pending_queue SET status = 'rejected' WHERE github_full_name = ?")
    .bind(githubFullName)
    .run()
}

export async function updateProject(db: D1Database, id: string, data: Partial<Project>): Promise<void> {
  const fields = Object.keys(data) as (keyof Project)[]
  const jsonFields = new Set(['tags', 'screenshots', 'alternative_to', 'target_users', 'use_cases', 'features'])
  const setClauses = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => jsonFields.has(f) ? JSON.stringify(data[f]) : data[f])
  await db
    .prepare(`UPDATE projects SET ${setClauses} WHERE id = ?`)
    .bind(...values, id)
    .run()
}
