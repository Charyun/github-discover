import { Pool, type PoolClient } from 'pg'
import format from 'pg-format'
import type { Industry, Scene, Project, ProjectRow, PendingProject } from '@/types'

/**
 * Module-level pg.Pool singleton.
 * Uses globalThis cache so HMR (next dev) reuses the same pool across reloads.
 * EdgeOne Pages surfaces env vars via process.env at request time.
 */
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL env var not set')
  }
  return new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
  })
}

export const pool: Pool =
  globalThis.__pgPool ?? createPool()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pool
}

/**
 * pg returns JSONB columns as already-parsed JS values. Normalize empty/null
 * to [] and cast to the expected string[] for the Project domain type.
 */
function parseProject(row: ProjectRow): Project {
  return {
    ...row,
    tags: (row.tags ?? []) as string[],
    screenshots: (row.screenshots ?? []) as string[],
    alternative_to: (row.alternative_to ?? []) as string[],
    target_users: (row.target_users ?? []) as string[],
    use_cases: (row.use_cases ?? []) as string[],
    features: (row.features ?? []) as string[],
  }
}

export async function getIndustries(client: PoolClient | Pool = pool): Promise<Industry[]> {
  const { rows } = await client.query<Industry>(
    'SELECT id, name_zh, name_en, icon, sort_order FROM industries ORDER BY sort_order'
  )
  return rows
}

export async function getScenesByIndustry(
  industryId: string,
  client: PoolClient | Pool = pool
): Promise<Scene[]> {
  const { rows } = await client.query<Scene>(
    'SELECT id, industry_id, name_zh FROM scenes WHERE industry_id = $1 ORDER BY id',
    [industryId]
  )
  return rows
}

export async function getAllScenes(client: PoolClient | Pool = pool): Promise<Scene[]> {
  const { rows } = await client.query<Scene>(
    'SELECT id, industry_id, name_zh FROM scenes ORDER BY industry_id, id'
  )
  return rows
}

export async function getPublishedProjects(
  opts: { industryId?: string; sceneId?: string; limit?: number; offset?: number } = {},
  client: PoolClient | Pool = pool
): Promise<Project[]> {
  const conditions = ["status = 'published'"]
  const params: unknown[] = []
  if (opts.industryId) {
    params.push(opts.industryId)
    conditions.push(`industry_id = $${params.length}`)
  }
  if (opts.sceneId) {
    params.push(opts.sceneId)
    conditions.push(`scene_id = $${params.length}`)
  }
  params.push(opts.limit ?? 20)
  const limitIdx = params.length
  params.push(opts.offset ?? 0)
  const offsetIdx = params.length

  const sql = `SELECT * FROM projects WHERE ${conditions.join(' AND ')} ORDER BY stars DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`
  const { rows } = await client.query<ProjectRow>(sql, params)
  return rows.map(parseProject)
}

export async function getProjectBySlug(
  slug: string,
  client: PoolClient | Pool = pool
): Promise<Project | null> {
  const { rows } = await client.query<ProjectRow>(
    "SELECT * FROM projects WHERE github_full_name = $1 AND status = 'published' LIMIT 1",
    [slug.replace('--', '/')]
  )
  return rows[0] ? parseProject(rows[0]) : null
}

export async function getAllPublishedSlugs(client: PoolClient | Pool = pool): Promise<string[]> {
  const { rows } = await client.query<{ github_full_name: string }>(
    "SELECT github_full_name FROM projects WHERE status = 'published'"
  )
  return rows.map(r => r.github_full_name.replace('/', '--'))
}

export async function searchProjects(
  query: string,
  opts: { industryId?: string; limit?: number } = {},
  client: PoolClient | Pool = pool
): Promise<Project[]> {
  // tsvector + trigram fallback. websearch_to_tsquery handles user input naturally
  // (quoted phrases, AND/OR). Industry filter is optional.
  const params: unknown[] = [query]
  let industryClause = ''
  if (opts.industryId) {
    params.push(opts.industryId)
    industryClause = `AND industry_id = $${params.length}`
  }
  params.push(opts.limit ?? 20)
  const limitIdx = params.length

  const sql = `
    SELECT * FROM projects
    WHERE status = 'published'
      AND (
        search_tsv @@ websearch_to_tsquery('simple', $1)
        OR display_name ILIKE '%' || $1 || '%'
        OR description_zh ILIKE '%' || $1 || '%'
      )
      ${industryClause}
    ORDER BY stars DESC
    LIMIT $${limitIdx}
  `
  const { rows } = await client.query<ProjectRow>(sql, params)
  return rows.map(parseProject)
}

export async function getRecentProjects(
  days: number,
  limit: number,
  client: PoolClient | Pool = pool
): Promise<Project[]> {
  const { rows } = await client.query<ProjectRow>(
    `SELECT * FROM projects
     WHERE status = 'published'
       AND published_at >= (NOW() - make_interval(days => $1::int))::text
     ORDER BY published_at DESC
     LIMIT $2`,
    [days, limit]
  )
  return rows.map(parseProject)
}

export async function getTopProjects(
  limit: number,
  client: PoolClient | Pool = pool
): Promise<Project[]> {
  const { rows } = await client.query<ProjectRow>(
    "SELECT * FROM projects WHERE status = 'published' ORDER BY stars DESC LIMIT $1",
    [limit]
  )
  return rows.map(parseProject)
}

export async function getPendingQueue(
  limit = 50,
  client: PoolClient | Pool = pool
): Promise<PendingProject[]> {
  const { rows } = await client.query<PendingProject>(
    "SELECT * FROM pending_queue WHERE status = 'pending' ORDER BY auto_score DESC LIMIT $1",
    [limit]
  )
  return rows
}

export async function getPendingProject(
  githubFullName: string,
  client: PoolClient | Pool = pool
): Promise<PendingProject | null> {
  const { rows } = await client.query<PendingProject>(
    'SELECT * FROM pending_queue WHERE github_full_name = $1 LIMIT 1',
    [githubFullName]
  )
  return rows[0] ?? null
}

export async function upsertPendingProjects(items: PendingProject[]): Promise<void> {
  if (items.length === 0) return
  const conn = await pool.connect()
  try {
    await conn.query('BEGIN')
    const values = items.map(i => [
      i.github_full_name,
      JSON.stringify(i.raw_data),
      i.auto_score,
      i.collected_at,
      'pending',
    ])
    const sql = `INSERT INTO pending_queue
                   (github_full_name, raw_data, auto_score, collected_at, status)
                 VALUES %L
                 ON CONFLICT (github_full_name) DO NOTHING`
    await conn.query(format(sql, values))
    await conn.query('COMMIT')
  } catch (err) {
    await conn.query('ROLLBACK')
    throw err
  } finally {
    conn.release()
  }
}

export async function approveProject(
  githubFullName: string,
  data: Partial<Project>
): Promise<void> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const conn = await pool.connect()
  try {
    await conn.query('BEGIN')
    await conn.query(
      `INSERT INTO projects (
         id, github_full_name, display_name, description_zh, industry_id, scene_id,
         tags, stars, language, license, updated_at, deploy_level, deploy_difficulty,
         chinese_support, screenshots, alternative_to, target_users, use_cases, features,
         github_url, homepage, deploy_command, quality_score, status, created_at, published_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,
         $7::jsonb,$8,$9,$10,$11,$12,$13,
         $14,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,$19::jsonb,
         $20,$21,$22,$23,'published',$24,$24
       )
       ON CONFLICT (github_full_name) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         description_zh = EXCLUDED.description_zh,
         industry_id = EXCLUDED.industry_id,
         scene_id = EXCLUDED.scene_id,
         tags = EXCLUDED.tags,
         status = 'published',
         published_at = EXCLUDED.published_at`,
      [
        id,
        githubFullName,
        data.display_name ?? '',
        data.description_zh ?? null,
        data.industry_id ?? null,
        data.scene_id ?? null,
        JSON.stringify(data.tags ?? []),
        data.stars ?? 0,
        data.language ?? null,
        data.license ?? null,
        data.updated_at ?? now,
        data.deploy_level ?? null,
        data.deploy_difficulty ?? null,
        data.chinese_support ?? null,
        JSON.stringify(data.screenshots ?? []),
        JSON.stringify(data.alternative_to ?? []),
        JSON.stringify(data.target_users ?? []),
        JSON.stringify(data.use_cases ?? []),
        JSON.stringify(data.features ?? []),
        data.github_url ?? `https://github.com/${githubFullName}`,
        data.homepage ?? null,
        data.deploy_command ?? null,
        data.quality_score ?? 0,
        now,
      ]
    )
    await conn.query(
      "UPDATE pending_queue SET status = 'approved' WHERE github_full_name = $1",
      [githubFullName]
    )
    await conn.query('COMMIT')
  } catch (err) {
    await conn.query('ROLLBACK')
    throw err
  } finally {
    conn.release()
  }
}

export async function rejectPendingProject(githubFullName: string): Promise<void> {
  await pool.query(
    "UPDATE pending_queue SET status = 'rejected' WHERE github_full_name = $1",
    [githubFullName]
  )
}

export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<void> {
  const fields = Object.keys(data) as (keyof Project)[]
  const jsonFields = new Set(['tags', 'screenshots', 'alternative_to', 'target_users', 'use_cases', 'features'])
  const setClauses = fields.map((f, i) => `${f} = $${i + 1}${jsonFields.has(f) ? '::jsonb' : ''}`).join(', ')
  const values = fields.map(f => {
    const v = data[f]
    return jsonFields.has(f) ? JSON.stringify(v ?? []) : v
  })
  await pool.query(
    `UPDATE projects SET ${setClauses} WHERE id = $${values.length + 1}`,
    [...values, id]
  )
}

/**
 * Convenience helper used by sync-stats webhook. Issues a single transaction
 * with one prepared UPDATE per repo.
 */
export async function syncProjectStats(
  updates: Array<{ github_full_name: string; stars: number; updated_at: string }>
): Promise<void> {
  if (updates.length === 0) return
  const conn = await pool.connect()
  try {
    await conn.query('BEGIN')
    const sql = 'UPDATE projects SET stars = $1, updated_at = $2 WHERE github_full_name = $3'
    for (const u of updates) {
      await conn.query(sql, [u.stars, u.updated_at, u.github_full_name])
    }
    await conn.query('COMMIT')
  } catch (err) {
    await conn.query('ROLLBACK')
    throw err
  } finally {
    conn.release()
  }
}
