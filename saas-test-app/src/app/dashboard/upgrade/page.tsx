'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Zap } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const features = {
  free: [
    'Up to 3 projects',
    '5 team members',
    'Basic task management',
    'Activity feed',
    '30 day history',
  ],
  pro: [
    'Unlimited projects',
    'Unlimited team members',
    'Advanced task management',
    'Custom fields',
    'Priority support',
    'Unlimited history',
    'Advanced analytics',
    'API access',
    'Custom integrations',
  ],
}

export default function UpgradePage() {
  const handleUpgrade = () => {
    toast.info('This is a demo feature. Payment integration would go here.')
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center p-2 bg-purple-100 dark:bg-purple-900/50 rounded-full mb-4">
          <Crown className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Upgrade to Pro</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400">
          Unlock powerful features to supercharge your team's productivity
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 mt-12">
        {/* Free Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-2xl">Free</CardTitle>
              <Badge variant="secondary">Current Plan</Badge>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-gray-500">/month</span>
            </div>
            <CardDescription className="mt-4">
              Perfect for individuals and small teams getting started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.free.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full mt-6">
                Current Plan
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-2 border-purple-200 dark:border-purple-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-purple-700 text-white px-4 py-1 text-xs font-medium">
            POPULAR
          </div>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-2xl">Pro</CardTitle>
              <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">$29</span>
              <span className="text-gray-500">/month</span>
            </div>
            <CardDescription className="mt-4">
              For teams that need advanced features and flexibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.pro.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>
            <Button onClick={handleUpgrade} className="w-full mt-6 bg-purple-600 hover:bg-purple-700">
              <Zap className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Feature Comparison */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle>Why upgrade to Pro?</CardTitle>
          <CardDescription>
            Get access to powerful features that scale with your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
                <Crown className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">No Limits</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create unlimited projects and invite unlimited team members. Scale without restrictions.
              </p>
            </div>

            <div>
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">Advanced Features</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get access to custom fields, advanced analytics, and powerful integrations.
              </p>
            </div>

            <div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Priority Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get help when you need it with priority email support and dedicated resources.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Can I cancel anytime?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes! You can cancel your Pro subscription at any time. Your data will remain accessible on the Free plan.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">What payment methods do you accept?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We accept all major credit cards including Visa, Mastercard, and American Express.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Is there a free trial?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes! Get a 14-day free trial of Pro when you upgrade. No credit card required.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

