export interface Industry {
  id: string
  name_zh: string
  name_en: string
  icon: string
  /** Renamed from `order` (PostgreSQL reserved word). */
  sort_order: number
}

export interface Scene {
  id: string
  industry_id: string
  name_zh: string
}

export interface Project {
  id: string
  github_full_name: string
  display_name: string
  description_zh: string | null
  industry_id: string
  scene_id: string | null
  tags: string[]
  stars: number
  language: string | null
  license: string | null
  updated_at: string
  deploy_level: 'L1' | 'L2' | 'L3' | 'L4' | null
  deploy_difficulty: number | null
  chinese_support: 'full' | 'partial' | 'none' | null
  screenshots: string[]
  alternative_to: string[]
  target_users: string[]
  use_cases: string[]
  features: string[]
  github_url: string
  homepage: string | null
  deploy_command: string | null
  quality_score: number
  status: 'pending' | 'published' | 'rejected'
  created_at: string
  published_at: string | null
}

/**
 * Wire format for pending projects. raw_data is a JSON object (PostgreSQL
 * JSONB returns parsed values; on the API input side the webhook handler
 * does JSON.parse before calling upsertPendingProjects).
 */
export interface PendingProject {
  github_full_name: string
  raw_data: Record<string, unknown>
  auto_score: number
  collected_at: string
  status: 'pending' | 'approved' | 'rejected'
}

/**
 * Raw row from the projects table. JSONB columns are returned by pg as
 * already-parsed JS values, so the JSON fields are `unknown[]` here.
 */
export type ProjectRow = Omit<Project, 'tags' | 'screenshots' | 'alternative_to' | 'target_users' | 'use_cases' | 'features'> & {
  tags: unknown[]
  screenshots: unknown[]
  alternative_to: unknown[]
  target_users: unknown[]
  use_cases: unknown[]
  features: unknown[]
}
