'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Profile, Workspace } from '@/lib/types/database'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  // Workspace state
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [isOwner, setIsOwner] = useState(false)

  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [taskUpdates, setTaskUpdates] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name || '')
        setEmail(profileData.email)
      }

      // Load workspace
      const { data: workspaceMember } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id)
        .single()

      if (workspaceMember) {
        setIsOwner(workspaceMember.role === 'owner')

        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', workspaceMember.workspace_id)
          .single()

        if (workspaceData) {
          setWorkspace(workspaceData)
          setWorkspaceName(workspaceData.name)
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profile.id)

      if (error) throw error

      toast.success('Profile updated successfully!')
      loadSettings()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspace || !isOwner) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: workspaceName })
        .eq('id', workspace.id)

      if (error) throw error

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_log').insert({
          workspace_id: workspace.id,
          user_id: user.id,
          action: 'updated_settings',
          entity_type: 'workspace',
          entity_id: workspace.id,
          metadata: { workspace_name: workspaceName },
        })
      }

      toast.success('Workspace settings updated!')
      loadSettings()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update workspace')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Preferences saved!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and workspace preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>

                <Separator />

                <div>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workspace Tab */}
        <TabsContent value="workspace">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>
                Manage your workspace configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isOwner && (
                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Only workspace owners can modify these settings.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSaveWorkspace} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    placeholder="My Workspace"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    disabled={saving || !isOwner}
                  />
                  <p className="text-xs text-gray-500">
                    This is your workspace's visible name within TaskFlow.
                  </p>
                </div>

                {workspace && (
                  <div className="space-y-2">
                    <Label>Workspace ID</Label>
                    <Input
                      value={workspace.slug}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800 font-mono text-sm"
                    />
                  </div>
                )}

                <Separator />

                <div>
                  <Button type="submit" disabled={saving || !isOwner}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Workspace
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          {isOwner && (
            <Card className="border-red-200 dark:border-red-900 mt-6">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions for your workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Delete Workspace</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Permanently delete this workspace and all of its data. This action cannot be undone.
                    </p>
                    <Button variant="destructive" disabled>
                      Delete Workspace
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what updates you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePreferences} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive email notifications for important updates
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Task Updates</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Get notified when tasks are assigned to you
                      </p>
                    </div>
                    <Switch
                      checked={taskUpdates}
                      onCheckedChange={setTaskUpdates}
                      disabled={!emailNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Digest</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive a weekly summary of your workspace activity
                      </p>
                    </div>
                    <Switch
                      checked={weeklyDigest}
                      onCheckedChange={setWeeklyDigest}
                      disabled={!emailNotifications}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

