import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Activity, FolderKanban, CheckCircle2, Users, Settings as SettingsIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ActivityWithUser } from '@/lib/types/database'

const activityIcons = {
  created_project: FolderKanban,
  created_task: CheckCircle2,
  completed_task: CheckCircle2,
  invited_member: Users,
  updated_settings: SettingsIcon,
}

const activityColors = {
  created_project: 'text-blue-500',
  created_task: 'text-green-500',
  completed_task: 'text-purple-500',
  invited_member: 'text-orange-500',
  updated_settings: 'text-gray-500',
}

const formatActivity = (activity: ActivityWithUser) => {
  const userName = activity.user?.full_name || 'Someone'
  const metadata = activity.metadata || {}

  switch (activity.action) {
    case 'created_project':
      return `${userName} created project "${metadata.project_name || 'Untitled'}"`
    case 'created_task':
      return `${userName} created task "${metadata.task_title || 'Untitled'}"`
    case 'completed_task':
      return `${userName} completed task "${metadata.task_title || 'Untitled'}"`
    case 'invited_member':
      return `${userName} invited ${metadata.email || 'a new member'} to the workspace`
    case 'updated_settings':
      return `${userName} updated workspace settings`
    default:
      return `${userName} performed an action`
  }
}

export default async function ActivityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's workspace
  const { data: workspaceMember } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!workspaceMember) return null

  // Get activity log
  const { data: activities } = await supabase
    .from('activity_log')
    .select(`
      *,
      user:profiles(id, full_name, email)
    `)
    .eq('workspace_id', workspaceMember.workspace_id)
    .order('created_at', { ascending: false })
    .limit(50)

  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Group activities by date
  const groupedActivities: { [key: string]: ActivityWithUser[] } = {}
  activities?.forEach((activity: any) => {
    const date = new Date(activity.created_at).toLocaleDateString()
    if (!groupedActivities[date]) {
      groupedActivities[date] = []
    }
    groupedActivities[date].push(activity)
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Feed</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          See what's happening in your workspace
        </p>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-6">
        {Object.keys(groupedActivities).length > 0 ? (
          Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">{date}</Badge>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              <div className="space-y-3">
                {dateActivities.map((activity: any) => {
                  const IconComponent = activityIcons[activity.action as keyof typeof activityIcons] || Activity
                  const iconColor = activityColors[activity.action as keyof typeof activityColors] || 'text-gray-500'

                  return (
                    <Card key={activity.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(activity.user?.full_name)}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <IconComponent className={`h-4 w-4 ${iconColor}`} />
                              <p className="text-sm font-medium">
                                {formatActivity(activity)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No activity yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
                Activity from your workspace will appear here as team members create projects, tasks, and collaborate.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

