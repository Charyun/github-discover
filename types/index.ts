export interface Industry {
  id: string
  name_zh: string
  name_en: string
  icon: string
  order: number
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

export interface PendingProject {
  github_full_name: string
  raw_data: string
  auto_score: number
  collected_at: string
  status: 'pending' | 'approved' | 'rejected'
}

export type ProjectRow = Omit<Project, 'tags' | 'screenshots' | 'alternative_to' | 'target_users' | 'use_cases' | 'features'> & {
  tags: string
  screenshots: string
  alternative_to: string
  target_users: string
  use_cases: string
  features: string
}
