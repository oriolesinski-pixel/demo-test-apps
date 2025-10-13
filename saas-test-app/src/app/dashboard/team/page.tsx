'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserPlus, MoreVertical, Mail, Crown, Loader2, Users as UsersIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { Profile, WorkspaceMember, Invitation } from '@/lib/types/database'

export default function TeamPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<(WorkspaceMember & { user: Profile })[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [workspaceId, setWorkspaceId] = useState<string>('')

  useEffect(() => {
    loadTeamData()
  }, [])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      // Get workspace
      const { data: workspaceMember } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      if (!workspaceMember) return
      setWorkspaceId(workspaceMember.workspace_id)

      // Load members
      const { data: membersData } = await supabase
        .from('workspace_members')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('workspace_id', workspaceMember.workspace_id)
        .order('joined_at', { ascending: true })

      if (membersData) {
        setMembers(membersData as any)
      }

      // Load pending invitations
      const { data: invitesData } = await supabase
        .from('invitations')
        .select('*')
        .eq('workspace_id', workspaceMember.workspace_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (invitesData) {
        setInvitations(invitesData)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !workspaceId) return

    setInviting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if user already exists in workspace
      const { data: existingMember } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail)
        .single()

      if (existingMember) {
        const { data: memberCheck } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', existingMember.id)
          .single()

        if (memberCheck) {
          throw new Error('User is already a member of this workspace')
        }
      }

      // Create invitation
      const { error } = await supabase.from('invitations').insert({
        workspace_id: workspaceId,
        email: inviteEmail,
        invited_by: user.id,
        status: 'pending',
      })

      if (error) throw error

      // Log activity
      await supabase.from('activity_log').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        action: 'invited_member',
        entity_type: 'invitation',
        entity_id: workspaceId,
        metadata: { email: inviteEmail },
      })

      toast.success('Invitation sent!')
      setInviteDialogOpen(false)
      setInviteEmail('')
      loadTeamData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === currentUserId) {
      toast.error('You cannot remove yourself')
      return
    }

    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success('Member removed')
      loadTeamData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member')
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      toast.success('Invitation cancelled')
      loadTeamData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel invitation')
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your workspace members and invitations
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Team Members */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Members ({members.length})</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member: any) => (
            <Card key={member.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(member.user.full_name)}</AvatarFallback>
                  </Avatar>
                  {member.user_id !== currentUserId && member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">
                      {member.user.full_name || 'Unnamed User'}
                    </h3>
                    {member.role === 'owner' && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {member.user.email}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Invitations ({invitations.length})</h2>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Invited {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Pending</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your workspace
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                disabled={inviting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
                disabled={inviting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

