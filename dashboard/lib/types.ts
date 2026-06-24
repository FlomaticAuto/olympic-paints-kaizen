export type Phase = 'schema' | 'rls' | 'ui' | 'spec' | 'deployed' | 'tested'

export interface DashboardProject {
  project_id: string
  name: string
  region: string | null
  table_count: number | null
  subsystems: string[] | null
  phases: Phase[] | null
  schema_doc_path: string | null
  spec_paths: string[] | null
  last_documented_at: string
  rls_clean: boolean
}

export type Intelligence = 'Claude' | 'ChatGPT' | 'Gemini' | 'Ollama' | 'Static' | 'Dynamic'

export interface NotionDashboard {
  notion_url: string
  name: string
  live_url: string | null
  notion_created_at: string | null
  imported_at: string
}

export interface NotionPage {
  notion_url: string
  name: string
  live_url: string | null
  intelligence: Intelligence | null
  dashboard_url: string | null
  notion_created_at: string | null
  imported_at: string
}

export function notionSlug(notionUrl: string): string {
  return notionUrl.split('/').pop() ?? notionUrl
}
