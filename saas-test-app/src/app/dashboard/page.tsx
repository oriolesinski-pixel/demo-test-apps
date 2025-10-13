import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FolderKanban, CheckCircle2, Clock, Users, Plus, ArrowRight, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
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

  // Get workspace stats
  const { data: projects, count: projectCount } = await supabase
    .from('projects')
    .select('*, tasks(*)', { count: 'exact' })
    .eq('workspace_id', workspaceMember.workspace_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5)

  const { count: totalTasks } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', user.id)

  const { count: completedTasks } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', user.id)
    .eq('status', 'done')

  const { count: pendingTasks } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', user.id)
    .eq('status', 'todo')

  const { data: teamMembers, count: teamCount } = await supabase
    .from('workspace_members')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceMember.workspace_id)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back! Here&apos;s an overview of your workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing">
            <Button variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400">
              <Crown className="mr-2 h-4 w-4" />
              Upgrade to Premium
            </Button>
          </Link>
          <Link href="/dashboard/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount || 0}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Across your workspace
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks || 0}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Assigned to you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks || 0}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Todo tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamCount || 0}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              In your workspace
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => {
              const projectTasks = project.tasks || []
              const doneTasks = projectTasks.filter((t: any) => t.status === 'done').length
              const totalProjectTasks = projectTasks.length

              return (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <Badge variant="secondary">{totalProjectTasks} tasks</Badge>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-2">
                          {project.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium">
                          {totalProjectTasks > 0
                            ? `${Math.round((doneTasks / totalProjectTasks) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: totalProjectTasks > 0
                              ? `${(doneTasks / totalProjectTasks) * 100}%`
                              : '0%',
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center max-w-sm">
                Get started by creating your first project to organize your work.
              </p>
              <Link href="/dashboard/projects/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

