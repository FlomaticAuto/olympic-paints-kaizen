import { createClient } from '@supabase/supabase-js'
import type { DashboardProject } from './types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_REGISTRY_URL!,
  process.env.NEXT_PUBLIC_REGISTRY_ANON_KEY!
)

export async function getAllProjects(): Promise<DashboardProject[]> {
  const { data, error } = await supabase
    .from('dashboard_projects')
    .select('*')
    .order('last_documented_at', { ascending: false })

  if (error) throw new Error(`Registry fetch failed: ${error.message}`)
  return data ?? []
}

export async function getProject(projectId: string): Promise<DashboardProject | null> {
  const { data, error } = await supabase
    .from('dashboard_projects')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw new Error(`Registry fetch failed: ${error.message}`)
  return data
}
