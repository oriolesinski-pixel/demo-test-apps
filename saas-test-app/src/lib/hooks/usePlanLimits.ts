import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plan, PLAN_LIMITS } from '@/lib/types/subscription'

export interface UsageStats {
  projects: number
  teamMembers: number
  tasks: number
  storageGB: number
}

export interface PlanCheck {
  plan: Plan
  limits: typeof PLAN_LIMITS[Plan]
  usage: UsageStats
  canCreateProject: boolean
  canInviteMember: boolean
  canCreateTask: (projectId: string) => Promise<boolean>
  isAtLimit: (resource: 'projects' | 'teamMembers') => boolean
  percentUsed: (resource: 'projects' | 'teamMembers') => number
  isPremium: boolean
  isEnterprise: boolean
}

export function usePlanLimits(workspaceId: string): PlanCheck | null {
  const [planCheck, setPlanCheck] = useState<PlanCheck | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadPlanData()
  }, [workspaceId])

  const loadPlanData = async () => {
    if (!workspaceId) return

    try {
      // Get workspace plan
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('plan')
        .eq('id', workspaceId)
        .single()

      const plan = (workspace?.plan || 'free') as Plan
      const limits = PLAN_LIMITS[plan]

      // Get usage stats
      const { count: projectCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')

      const { count: memberCount } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)

      const { count: taskCount } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('project_id', 
          (await supabase
            .from('projects')
            .select('id')
            .eq('workspace_id', workspaceId)
          ).data?.map(p => p.id) || []
        )

      const usage: UsageStats = {
        projects: projectCount || 0,
        teamMembers: memberCount || 0,
        tasks: taskCount || 0,
        storageGB: 0, // Mock - would calculate actual storage
      }

      const canCreateProject = limits.projects === null || usage.projects < limits.projects
      const canInviteMember = limits.teamMembers === null || usage.teamMembers < limits.teamMembers

      const canCreateTask = async (projectId: string): Promise<boolean> => {
        if (limits.tasksPerProject === null) return true

        const { count } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)

        return (count || 0) < limits.tasksPerProject
      }

      const isAtLimit = (resource: 'projects' | 'teamMembers'): boolean => {
        const limit = limits[resource]
        if (limit === null) return false
        return usage[resource] >= limit
      }

      const percentUsed = (resource: 'projects' | 'teamMembers'): number => {
        const limit = limits[resource]
        if (limit === null) return 0
        return Math.min(100, (usage[resource] / limit) * 100)
      }

      setPlanCheck({
        plan,
        limits,
        usage,
        canCreateProject,
        canInviteMember,
        canCreateTask,
        isAtLimit,
        percentUsed,
        isPremium: plan === 'premium' || plan === 'enterprise',
        isEnterprise: plan === 'enterprise',
      })
    } catch (error) {
      console.error('Failed to load plan data:', error)
    }
  }

  return planCheck
}

