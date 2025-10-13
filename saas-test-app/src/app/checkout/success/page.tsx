'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Zap, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CheckoutSuccessPage() {
  const supabase = createClient()

  useEffect(() => {
    // Log success page view
    const logEvent = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: workspace } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .single()

        if (workspace) {
          await supabase.from('activity_log').insert({
            workspace_id: workspace.workspace_id,
            user_id: user.id,
            action: 'upgrade_success_viewed',
            entity_type: 'subscription',
            entity_id: workspace.workspace_id,
            metadata: { page: 'checkout_success' },
          })
        }
      } catch (error) {
        console.error('Failed to log event:', error)
      }
    }

    logEvent()

    // Optional: Add confetti animation here
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-12 pb-8 text-center">
          {/* Success Icon */}
          <div className="relative inline-block mb-6">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto relative">
              <CheckCircle2 className="h-12 w-12 text-white" />
              {/* Sparkle effects */}
              <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
              <Sparkles className="h-4 w-4 text-yellow-400 absolute -bottom-1 -left-1 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          {/* Main Message */}
          <h1 className="text-4xl font-bold mb-3">
            🎉 Welcome to Premium!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Your upgrade is complete. You now have access to all premium features.
          </p>

          {/* Feature Highlights */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-4">You now have access to:</h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-left">
              {[
                'Unlimited projects & tasks',
                'Unlimited team members',
                'Advanced analytics',
                'Custom fields',
                'Project templates',
                'Bulk actions',
                'Export data',
                'API access',
                'Priority support',
                '10GB file storage',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-3">
            <Link href="/dashboard">
              <Button size="lg" className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
                <Zap className="mr-2 h-5 w-5" />
                Start Using Premium Features
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/dashboard/settings/billing">
              <Button size="lg" variant="outline" className="w-full">
                View Billing Details
              </Button>
            </Link>
          </div>

          {/* Confirmation Details */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              A confirmation email has been sent to your inbox.
            </p>
            <p className="text-xs text-gray-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@taskflow.app" className="text-purple-600 hover:underline">
                support@taskflow.app
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

