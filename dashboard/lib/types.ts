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
