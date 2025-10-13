import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, FolderKanban, Calendar, Archive } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default async function ProjectsPage() {
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

  // Get all projects with task counts
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      tasks(id, status),
      created_user:profiles!projects_created_by_fkey(full_name)
    `)
    .eq('workspace_id', workspaceMember.workspace_id)
    .order('created_at', { ascending: false })

  const activeProjects = projects?.filter(p => p.status === 'active') || []
  const archivedProjects = projects?.filter(p => p.status === 'archived') || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and organize your team&apos;s projects
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Active Projects */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Active Projects ({activeProjects.length})</h2>
        {activeProjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map((project: any) => {
              const tasks = project.tasks || []
              const doneTasks = tasks.filter((t: any) => t.status === 'done').length
              const totalTasks = tasks.length

              return (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                          {project.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <FolderKanban className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-medium">
                            {totalTasks > 0
                              ? `${doneTasks}/${totalTasks} tasks`
                              : 'No tasks'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: totalTasks > 0
                                ? `${(doneTasks / totalTasks) * 100}%`
                                : '0%',
                            }}
                          />
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                        </div>
                        {project.created_user && (
                          <span className="truncate">by {project.created_user.full_name}</span>
                        )}
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
              <h3 className="text-lg font-medium mb-2">No active projects</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center max-w-sm">
                Create your first project to start organizing tasks and collaborating with your team.
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

      {/* Archived Projects */}
      {archivedProjects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Archive className="h-5 w-5 text-gray-400" />
            Archived Projects ({archivedProjects.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {archivedProjects.map((project: any) => {
              const tasks = project.tasks || []
              const totalTasks = tasks.length

              return (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate flex items-center gap-2">
                            {project.name}
                            <Badge variant="secondary" className="text-xs">Archived</Badge>
                          </CardTitle>
                          {project.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

