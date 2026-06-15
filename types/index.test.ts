import { describe, it, expect } from 'vitest'
import type { Project, ProjectRow } from './index'

describe('ProjectRow JSON fields', () => {
  it('can parse tags from JSON string', () => {
    const row: ProjectRow = {
      id: '1', github_full_name: 'a/b', display_name: 'A',
      description_zh: null, industry_id: 'prod', scene_id: null,
      tags: '["team","kanban"]',
      stars: 100, language: 'TypeScript', license: 'MIT',
      updated_at: '2026-01-01', deploy_level: 'L2',
      deploy_difficulty: 2, chinese_support: 'partial',
      screenshots: '[]', alternative_to: '["Jira"]',
      target_users: '["PM"]', use_cases: '["agile"]',
      features: '["kanban"]', github_url: 'https://github.com/a/b',
      homepage: null, deploy_command: null, quality_score: 80,
      status: 'published', created_at: '2026-01-01', published_at: '2026-01-02',
    }
    const tags: string[] = JSON.parse(row.tags)
    expect(tags).toEqual(['team', 'kanban'])
  })
})
