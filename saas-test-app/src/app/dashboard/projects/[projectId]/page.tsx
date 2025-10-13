'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Edit,
  Archive,
  CheckCircle2,
  Clock,
  Circle,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Project, Task, Profile, TaskWithRelations } from '@/lib/types/database'

const statusConfig = {
  todo: { label: 'Todo', icon: Circle, color: 'text-gray-500' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-500' },
  done: { label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-red-100 text-red-800' },
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [teamMembers, setTeamMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [editTaskOpen, setEditTaskOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // Form states
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [taskAssignedTo, setTaskAssignedTo] = useState<string>('unassigned')
  const [taskDueDate, setTaskDueDate] = useState('')

  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  useEffect(() => {
    loadProjectData()
  }, [params.projectId])

  const loadProjectData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.projectId)
        .single()

      if (projectError) throw projectError
      setProject(projectData)
      setProjectName(projectData.name)
      setProjectDescription(projectData.description || '')

      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, email),
          created_user:profiles!tasks_created_by_fkey(id, full_name)
        `)
        .eq('project_id', params.projectId)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError
      setTasks(tasksData || [])

      // Load team members
      const { data: workspace } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      if (workspace) {
        const { data: members } = await supabase
          .from('workspace_members')
          .select('user_id, profiles(id, full_name, email)')
          .eq('workspace_id', workspace.workspace_id)

        if (members) {
          setTeamMembers(members.map((m: any) => m.profiles).filter(Boolean))
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('tasks').insert({
        project_id: params.projectId as string,
        title: taskTitle,
        description: taskDescription || null,
        priority: taskPriority,
        assigned_to: (taskAssignedTo && taskAssignedTo !== 'unassigned') ? taskAssignedTo : null,
        due_date: taskDueDate || null,
        created_by: user.id,
        status: 'todo',
      })

      if (error) throw error

      // Log activity
      const { data: workspace } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', params.projectId)
        .single()

      if (workspace) {
        await supabase.from('activity_log').insert({
          workspace_id: workspace.workspace_id,
          user_id: user.id,
          action: 'created_task',
          entity_type: 'task',
          entity_id: params.projectId as string,
          metadata: { task_title: taskTitle, project_id: params.projectId },
        })
      }

      toast.success('Task created successfully!')
      setCreateTaskOpen(false)
      resetTaskForm()
      loadProjectData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task')
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      toast.success('Task status updated!')
      loadProjectData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task')
    }
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: taskTitle,
          description: taskDescription || null,
          priority: taskPriority,
          assigned_to: (taskAssignedTo && taskAssignedTo !== 'unassigned') ? taskAssignedTo : null,
          due_date: taskDueDate || null,
        })
        .eq('id', selectedTask.id)

      if (error) throw error

      toast.success('Task updated successfully!')
      setEditTaskOpen(false)
      setSelectedTask(null)
      resetTaskForm()
      loadProjectData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      toast.success('Task deleted!')
      loadProjectData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete task')
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: projectName,
          description: projectDescription || null,
        })
        .eq('id', params.projectId)

      if (error) throw error

      toast.success('Project updated successfully!')
      setEditProjectOpen(false)
      loadProjectData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update project')
    }
  }

  const handleArchiveProject = async () => {
    if (!confirm('Are you sure you want to archive this project?')) return

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('id', params.projectId)

      if (error) throw error

      toast.success('Project archived!')
      router.push('/dashboard/projects')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive project')
    }
  }

  const handleDeleteProject = async () => {
    const confirmed = confirm(
      'Are you sure you want to permanently delete this project?\n\nThis will also delete all tasks and cannot be undone.'
    )
    
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', params.projectId)

      if (error) throw error

      toast.success('Project deleted permanently!')
      router.push('/dashboard/projects')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete project')
    }
  }

  const resetTaskForm = () => {
    setTaskTitle('')
    setTaskDescription('')
    setTaskPriority('medium')
    setTaskAssignedTo('unassigned')
    setTaskDueDate('')
  }

  const openEditTask = (task: TaskWithRelations) => {
    setSelectedTask(task)
    setTaskTitle(task.title)
    setTaskDescription(task.description || '')
    setTaskPriority(task.priority)
    setTaskAssignedTo(task.assigned_to || 'unassigned')
    setTaskDueDate(task.due_date ? task.due_date.split('T')[0] : '')
    setEditTaskOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Project not found</h2>
        <Link href="/dashboard/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>
    )
  }

  const todoTasks = tasks.filter(t => t.status === 'todo')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              {project.status === 'archived' && (
                <Badge variant="secondary">Archived</Badge>
              )}
            </div>
            {project.description && (
              <p className="text-gray-500 dark:text-gray-400 mt-2">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateTaskOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditProjectOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleArchiveProject} className="text-orange-600">
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteProject} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{todoTasks.length}</div>
              <div className="text-sm text-gray-500">Todo</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{inProgressTasks.length}</div>
              <div className="text-sm text-gray-500">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{doneTasks.length}</div>
              <div className="text-sm text-gray-500">Done</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tasks Board */}
      <div className="grid gap-6 md:grid-cols-3">
        {(['todo', 'in_progress', 'done'] as const).map((status) => {
          const statusTasks = tasks.filter(t => t.status === status)
          const StatusIcon = statusConfig[status].icon

          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-4">
                <StatusIcon className={cn('h-5 w-5', statusConfig[status].color)} />
                <h3 className="font-semibold">{statusConfig[status].label}</h3>
                <Badge variant="secondary" className="ml-auto">{statusTasks.length}</Badge>
              </div>

              <div className="space-y-3">
                {statusTasks.map((task) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {status !== 'in_progress' && (
                              <DropdownMenuItem onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}>
                                <Clock className="mr-2 h-4 w-4" />
                                Mark In Progress
                              </DropdownMenuItem>
                            )}
                            {status !== 'done' && (
                              <DropdownMenuItem onClick={() => handleUpdateTaskStatus(task.id, 'done')}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Mark Done
                              </DropdownMenuItem>
                            )}
                            {status !== 'todo' && (
                              <DropdownMenuItem onClick={() => handleUpdateTaskStatus(task.id, 'todo')}>
                                <Circle className="mr-2 h-4 w-4" />
                                Mark Todo
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditTask(task)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn('text-xs', priorityConfig[task.priority].color)}>
                          {priorityConfig[task.priority].label}
                        </Badge>
                        {task.assigned_user && (
                          <span className="text-xs text-gray-500">
                            {task.assigned_user.full_name}
                          </span>
                        )}
                      </div>

                      {task.due_date && (
                        <div className="text-xs text-gray-500 mt-2">
                          Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {statusTasks.length === 0 && (
                  <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed rounded-lg">
                    No {statusConfig[status].label.toLowerCase()} tasks
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task to this project</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                placeholder="Task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Task description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={taskPriority} onValueChange={(value: any) => setTaskPriority(value)}>
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-assigned">Assign to</Label>
                <Select value={taskAssignedTo} onValueChange={setTaskAssignedTo}>
                  <SelectTrigger id="task-assigned">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateTaskOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editTaskOpen} onOpenChange={setEditTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-title">Title *</Label>
              <Input
                id="edit-task-title"
                placeholder="Task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                placeholder="Task description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-task-priority">Priority</Label>
                <Select value={taskPriority} onValueChange={(value: any) => setTaskPriority(value)}>
                  <SelectTrigger id="edit-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-assigned">Assign to</Label>
                <Select value={taskAssignedTo} onValueChange={setTaskAssignedTo}>
                  <SelectTrigger id="edit-task-assigned">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-task-due-date">Due Date</Label>
              <Input
                id="edit-task-due-date"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTaskOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name *</Label>
              <Input
                id="project-name"
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Project description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProjectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

