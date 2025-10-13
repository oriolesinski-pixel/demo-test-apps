export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Workspace = {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: string
  updated_at: string
}

export type WorkspaceMember = {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export type Project = {
  id: string
  workspace_id: string
  name: string
  description: string | null
  status: 'active' | 'archived'
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  assigned_to: string | null
  created_by: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export type Comment = {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export type Invitation = {
  id: string
  workspace_id: string
  email: string
  invited_by: string | null
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  created_at: string
}

export type ActivityLog = {
  id: string
  workspace_id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  metadata: Record<string, any>
  created_at: string
}

// Extended types with relations
export type TaskWithRelations = Task & {
  assigned_user?: Profile | null
  created_user?: Profile | null
  project?: Project
}

export type ProjectWithRelations = Project & {
  created_user?: Profile | null
  tasks?: Task[]
  task_count?: number
}

export type CommentWithUser = Comment & {
  user: Profile
}

export type ActivityWithUser = ActivityLog & {
  user?: Profile | null
}

