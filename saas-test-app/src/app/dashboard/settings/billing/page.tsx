'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CreditCard,
  Download,
  Crown,
  Loader2,
  Calendar,
  TrendingUp,
  Users,
  FolderKanban,
  HardDrive,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Plan, Invoice } from '@/lib/types/subscription'
import { cn } from '@/lib/utils'

export default function BillingPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<Plan>('free')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual' | null>(null)
  const [planStartedAt, setPlanStartedAt] = useState<string | null>(null)
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [workspaceId, setWorkspaceId] = useState<string>('')

  // Usage stats
  const [projectCount, setProjectCount] = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  const [storageUsed, setStorageUsed] = useState(2.4) // Mock

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get workspace with plan
      const { data: workspaceMember } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      if (!workspaceMember) return
      setWorkspaceId(workspaceMember.workspace_id)

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('plan, billing_cycle, plan_started_at, plan_expires_at')
        .eq('id', workspaceMember.workspace_id)
        .single()

      if (workspace) {
        setPlan(workspace.plan || 'free')
        setBillingCycle(workspace.billing_cycle)
        setPlanStartedAt(workspace.plan_started_at)
        setPlanExpiresAt(workspace.plan_expires_at)
      }

      // Get usage stats
      const { count: projects } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceMember.workspace_id)
        .eq('status', 'active')

      const { count: members } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceMember.workspace_id)

      setProjectCount(projects || 0)
      setMemberCount(members || 0)

      // Get invoices
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('workspace_id', workspaceMember.workspace_id)
        .order('billing_date', { ascending: false })
        .limit(5)

      if (invoiceData) {
        setInvoices(invoiceData as Invoice[])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = () => {
    if (!confirm('Are you sure you want to cancel your Premium subscription?')) return
    toast.info('This is a demo. In production, this would cancel your subscription.')
  }

  const handleUpdatePayment = () => {
    toast.info('This is a demo. In production, this would open a payment method update form.')
  }

  const getUsagePercent = (current: number, limit: number | null) => {
    if (limit === null) return 0
    return Math.min(100, (current / limit) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const isPremium = plan === 'premium' || plan === 'enterprise'

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                {isPremium && <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
              </CardTitle>
              <CardDescription>Your active subscription plan</CardDescription>
            </div>
            {!isPremium && (
              <Link href="/pricing">
                <Button className="bg-gradient-to-r from-purple-600 to-purple-700">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold capitalize">{plan}</h3>
                {isPremium && <Badge variant="secondary">Active</Badge>}
              </div>
              {billingCycle && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Billed {billingCycle === 'monthly' ? 'monthly' : 'annually'}
                </p>
              )}
            </div>
            {isPremium && (
              <div className="text-right">
                <div className="text-3xl font-bold">
                  ${billingCycle === 'monthly' ? '29' : '290'}
                </div>
                <div className="text-sm text-gray-500">
                  /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                </div>
              </div>
            )}
          </div>

          {isPremium && planExpiresAt && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>
                Next billing date: {new Date(planExpiresAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}

          {isPremium && (
            <div className="flex items-center gap-3">
              <Link href="/pricing">
                <Button variant="outline">Change Plan</Button>
              </Link>
              <Button variant="outline" onClick={handleCancelSubscription}>
                Cancel Subscription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Meters */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>Track your resource usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Projects */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Projects</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {projectCount} / {isPremium ? '∞' : '3'}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all',
                  isPremium ? 'bg-green-500' : projectCount >= 3 ? 'bg-red-500' : 'bg-blue-600'
                )}
                style={{ width: `${isPremium ? 24 : getUsagePercent(projectCount, 3)}%` }}
              />
            </div>
            {!isPremium && projectCount >= 3 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                ⚠️ You've reached your project limit
              </p>
            )}
          </div>

          {/* Team Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Team Members</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {memberCount} / {isPremium ? '∞' : '5'}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all',
                  isPremium ? 'bg-green-500' : memberCount >= 5 ? 'bg-red-500' : 'bg-blue-600'
                )}
                style={{ width: `${isPremium ? 24 : getUsagePercent(memberCount, 5)}%` }}
              />
            </div>
          </div>

          {/* Storage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Storage</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {storageUsed.toFixed(1)} GB / {isPremium ? '10' : '1'} GB
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${getUsagePercent(storageUsed, isPremium ? 10 : 1)}%` }}
              />
            </div>
          </div>

          {!isPremium && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                Upgrade to Premium for unlimited projects, team members, and 10GB storage.
                <Link href="/pricing">
                  <Button variant="link" className="p-0 h-auto ml-1">
                    View plans →
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      {isPremium && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Manage your payment information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">Visa •••• 4242</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Expires 12/2028</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleUpdatePayment}>
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      {isPremium && invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View your past invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <p className="font-medium">
                        {new Date(invoice.billing_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {invoice.invoice_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={invoice.status === 'paid' ? 'secondary' : 'destructive'}>
                      {invoice.status}
                    </Badge>
                    <span className="font-medium">${invoice.amount.toFixed(2)}</span>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade CTA for Free Users */}
      {!isPremium && (
        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Unlock Premium Features</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Get unlimited everything, advanced analytics, and priority support starting at just $29/month.
                </p>
                <div className="flex items-center gap-3">
                  <Link href="/pricing">
                    <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
                      <Crown className="mr-2 h-4 w-4" />
                      View Pricing
                    </Button>
                  </Link>
                  <Link href="/checkout?plan=premium&cycle=monthly">
                    <Button variant="outline">
                      Start 14-Day Trial
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

