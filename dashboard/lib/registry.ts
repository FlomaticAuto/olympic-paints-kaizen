import { createClient } from '@supabase/supabase-js'
import type { DashboardProject, NotionDashboard, NotionPage, Skill } from './types'
import { notionSlug } from './types'

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

export async function getAllNotionDashboards(): Promise<NotionDashboard[]> {
  const { data, error } = await supabase
    .from('notion_dashboards')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(`Notion dashboards fetch failed: ${error.message}`)
  return data ?? []
}

export async function getNotionDashboardBySlug(
  slug: string,
): Promise<{ dashboard: NotionDashboard; pages: NotionPage[] } | null> {
  const dashboards = await getAllNotionDashboards()
  const dashboard = dashboards.find((d) => notionSlug(d.notion_url) === slug)
  if (!dashboard) return null

  const { data: pages, error } = await supabase
    .from('notion_pages')
    .select('*')
    .eq('dashboard_url', dashboard.notion_url)
    .order('name', { ascending: true })

  if (error) throw new Error(`Notion pages fetch failed: ${error.message}`)
  return { dashboard, pages: pages ?? [] }
}

export async function getNotionPageBySlug(
  dashboardSlug: string,
  pageSlug: string,
): Promise<{ dashboard: NotionDashboard; page: NotionPage; siblings: NotionPage[] } | null> {
  const result = await getNotionDashboardBySlug(dashboardSlug)
  if (!result) return null
  const page = result.pages.find((p) => notionSlug(p.notion_url) === pageSlug)
  if (!page) return null
  return { dashboard: result.dashboard, page, siblings: result.pages }
}

export async function getAllSkills(): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(`Skills fetch failed: ${error.message}`)
  return data ?? []
}

export async function getSkillBySlug(slug: string): Promise<{
  skill: Skill
  supersededByName: string | null
  supersedesName: string | null
} | null> {
  const skills = await getAllSkills()
  const skill = skills.find((s) => notionSlug(s.notion_url) === slug)
  if (!skill) return null

  const supersededByName = skill.superseded_by
    ? (skills.find((s) => s.notion_url === skill.superseded_by)?.name ?? null)
    : null
  const supersedesName = skills.find((s) => s.superseded_by === skill.notion_url)?.name ?? null

  return { skill, supersededByName, supersedesName }
}
