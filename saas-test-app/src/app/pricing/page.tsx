'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Check, Crown, Zap, Building2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { PLAN_FEATURES, PLAN_PRICING } from '@/lib/types/subscription'
import { cn } from '@/lib/utils'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for individuals and small teams getting started',
      price: 0,
      icon: Zap,
      features: PLAN_FEATURES.free,
      cta: 'Continue Free',
      ctaVariant: 'outline' as const,
      highlighted: false,
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'For teams that need advanced features and flexibility',
      price: billingCycle === 'monthly' ? PLAN_PRICING.premium.monthly : PLAN_PRICING.premium.annual,
      icon: Crown,
      features: PLAN_FEATURES.premium,
      cta: 'Upgrade Now',
      ctaVariant: 'default' as const,
      highlighted: true,
      badge: 'POPULAR',
      savings: billingCycle === 'annual' ? `Save $${PLAN_PRICING.premium.annualSavings}` : null,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Custom solutions for large organizations',
      price: null,
      icon: Building2,
      features: PLAN_FEATURES.enterprise,
      cta: 'Contact Sales',
      ctaVariant: 'outline' as const,
      highlighted: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-gray-900/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">TaskFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Pricing Plans That Scale
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              With Your Team
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Choose the perfect plan for your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={cn(
            'text-sm font-medium transition-colors',
            billingCycle === 'monthly' ? 'text-foreground' : 'text-gray-500'
          )}>
            Monthly
          </span>
          <Switch
            checked={billingCycle === 'annual'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
          />
          <span className={cn(
            'text-sm font-medium transition-colors',
            billingCycle === 'annual' ? 'text-foreground' : 'text-gray-500'
          )}>
            Annual
          </span>
          {billingCycle === 'annual' && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Save 20%
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {plans.map((plan) => {
            const PlanIcon = plan.icon
            
            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative overflow-hidden transition-all',
                  plan.highlighted && 'border-2 border-purple-200 dark:border-purple-800 shadow-xl scale-105'
                )}
              >
                {plan.badge && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-purple-700 text-white px-4 py-1 text-xs font-medium">
                    {plan.badge}
                  </div>
                )}

                <CardHeader className="text-center pb-8 pt-6">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <PlanIcon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>

                  <div className="mt-6">
                    {plan.price === null ? (
                      <div className="text-3xl font-bold">Custom</div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold">${plan.price}</span>
                          {plan.price > 0 && (
                            <span className="text-gray-500">
                              /{billingCycle === 'monthly' ? 'month' : 'year'}
                            </span>
                          )}
                        </div>
                        {plan.savings && (
                          <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                            {plan.savings}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature.name}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.id === 'enterprise' ? (
                    <Button variant={plan.ctaVariant} className="w-full" asChild>
                      <a href="mailto:sales@taskflow.app">
                        {plan.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : plan.id === 'premium' ? (
                    <Link href={`/checkout?plan=premium&cycle=${billingCycle}`}>
                      <Button variant={plan.ctaVariant} className={cn(
                        'w-full',
                        plan.highlighted && 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                      )}>
                        <Crown className="mr-2 h-4 w-4" />
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/signup">
                      <Button variant={plan.ctaVariant} className="w-full">
                        {plan.cta}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Can I change plans anytime?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any charges.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards including Visa, Mastercard, American Express, and Discover. Annual plans can also be paid via bank transfer.',
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! Get a 14-day free trial of Premium when you upgrade. No credit card required to start.',
              },
              {
                q: 'What happens if I downgrade?',
                a: 'Your data is never deleted. If you exceed the Free plan limits after downgrading, you\'ll have read-only access to extra data until you upgrade again or remove items.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'Yes, we offer a 30-day money-back guarantee. If you\'re not satisfied, contact us for a full refund.',
              },
              {
                q: 'What about enterprise pricing?',
                a: 'Enterprise pricing is customized based on your team size and needs. Contact our sales team for a personalized quote.',
              },
            ].map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-12 text-white max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to upgrade?</h2>
            <p className="text-xl mb-6 text-purple-100">
              Join thousands of teams using TaskFlow Premium to ship faster.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/checkout?plan=premium&cycle=monthly">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 hover:bg-white/20 text-white border-white/30">
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20 py-8 text-center text-gray-600 dark:text-gray-400">
        <p>© 2025 TaskFlow. Built for demo purposes.</p>
        <div className="flex items-center justify-center gap-4 mt-4 text-sm">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <span>•</span>
          <a href="mailto:support@taskflow.app" className="hover:text-foreground">Support</a>
          <span>•</span>
          <Link href="/login" className="hover:text-foreground">Login</Link>
        </div>
      </footer>
    </div>
  )
}

