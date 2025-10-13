'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Crown, FolderKanban, Users } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface UsageWidgetProps {
  workspaceId: string
}

export function UsageWidget({ workspaceId }: UsageWidgetProps) {
  const supabase = createClient()
  const [plan, setPlan] = useState<string>('free')
  const [projectCount, setProjectCount] = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsage()
  }, [workspaceId])

  const loadUsage = async () => {
    try {
      // Get plan
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('plan')
        .eq('id', workspaceId)
        .single()

      setPlan(workspace?.plan || 'free')

      // Get counts
      const { count: projects } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')

      const { count: members } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)

      setProjectCount(projects || 0)
      setMemberCount(members || 0)
    } catch (error) {
      console.error('Failed to load usage:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || plan !== 'free') return null

  const projectPercent = Math.min(100, (projectCount / 3) * 100)
  const memberPercent = Math.min(100, (memberCount / 5) * 100)
  const isProjectWarning = projectCount >= 2
  const isMemberWarning = memberCount >= 4

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Free Plan</span>
          <Crown className="h-4 w-4 text-gray-400" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />
              Projects
            </span>
            <span className={cn(
              'font-medium',
              isProjectWarning && 'text-orange-600 dark:text-orange-400'
            )}>
              {projectCount}/3
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all',
                projectCount >= 3 ? 'bg-red-500' : isProjectWarning ? 'bg-orange-500' : 'bg-blue-600'
              )}
              style={{ width: `${projectPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Members
            </span>
            <span className={cn(
              'font-medium',
              isMemberWarning && 'text-orange-600 dark:text-orange-400'
            )}>
              {memberCount}/5
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all',
                memberCount >= 5 ? 'bg-red-500' : isMemberWarning ? 'bg-orange-500' : 'bg-blue-600'
              )}
              style={{ width: `${memberPercent}%` }}
            />
          </div>
        </div>

        <Link href="/pricing">
          <Button size="sm" className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
            <Crown className="mr-2 h-3 w-3" />
            Upgrade
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

