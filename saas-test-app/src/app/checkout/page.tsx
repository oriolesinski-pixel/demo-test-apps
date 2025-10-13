'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, ArrowRight, CreditCard, Lock, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PLAN_PRICING } from '@/lib/types/subscription'
import { cn } from '@/lib/utils'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState(1)
  const [processing, setProcessing] = useState(false)
  
  // Plan details from URL
  const plan = searchParams.get('plan') || 'premium'
  const cycle = (searchParams.get('cycle') || 'monthly') as 'monthly' | 'annual'
  
  // Form state
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardholderName, setCardholderName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')

  // Calculate pricing
  const basePrice = cycle === 'monthly' 
    ? PLAN_PRICING.premium.monthly 
    : PLAN_PRICING.premium.annual
  const tax = basePrice * 0.08 // 8% tax
  const total = basePrice + tax

  useEffect(() => {
    // Track checkout started
    logEvent('checkout_started', { plan, billing_cycle: cycle, amount: total })
  }, [])

  const logEvent = async (eventType: string, metadata: any = {}) => {
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
          action: eventType,
          entity_type: 'subscription',
          entity_id: workspace.workspace_id,
          metadata,
        })
      }
    } catch (error) {
      console.error('Failed to log event:', error)
    }
  }

  const handleContinueToPayment = () => {
    logEvent('checkout_step_viewed', { step: 2 })
    setStep(2)
  }

  const handleCompleteCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    // Validate card (mock)
    if (!cardNumber || !expiry || !cvv || !cardholderName) {
      toast.error('Please fill in all payment details')
      setProcessing(false)
      return
    }

    // Log checkout attempt
    await logEvent('checkout_step_viewed', { step: 3 })

    try {
      // Simulate payment processing (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000))

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get workspace
      const { data: workspace } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      if (!workspace) throw new Error('Workspace not found')

      // Update workspace plan
      await supabase
        .from('workspaces')
        .update({
          plan: 'premium',
          billing_cycle: cycle,
          plan_started_at: new Date().toISOString(),
          plan_expires_at: cycle === 'monthly'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', workspace.workspace_id)

      // Log subscription event
      await supabase.from('subscription_events').insert({
        workspace_id: workspace.workspace_id,
        user_id: user.id,
        event_type: 'upgrade',
        from_plan: 'free',
        to_plan: 'premium',
        billing_cycle: cycle,
        amount: total,
        metadata: { checkout_method: 'mock' },
      })

      // Log activity
      await logEvent('checkout_completed', { 
        plan: 'premium',
        billing_cycle: cycle,
        amount: total,
      })

      // Create mock invoice
      await supabase.from('invoices').insert({
        workspace_id: workspace.workspace_id,
        invoice_number: `INV-${Date.now()}`,
        amount: total,
        status: 'paid',
        billing_date: new Date().toISOString(),
        plan: 'premium',
        billing_cycle: cycle,
      })

      // Redirect to success page
      router.push('/checkout/success')
    } catch (error: any) {
      toast.error(error.message || 'Payment failed')
      await logEvent('checkout_error', { error: error.message })
    } finally {
      setProcessing(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const chunks = cleaned.match(/.{1,4}/g) || []
    return chunks.join(' ').slice(0, 19)
  }

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`
    }
    return cleaned
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Upgrade</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Join thousands of teams using TaskFlow Premium
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center font-medium transition-colors',
                  s < step && 'bg-green-500 text-white',
                  s === step && 'bg-purple-600 text-white',
                  s > step && 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                )}
              >
                {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    'w-16 h-1 mx-2',
                    s < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="md:col-span-2">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Plan Selection</CardTitle>
                  <CardDescription>Review your selected plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Premium Plan</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Billed {cycle === 'monthly' ? 'monthly' : 'annually'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${basePrice}</div>
                      <div className="text-sm text-gray-500">
                        /{cycle === 'monthly' ? 'mo' : 'yr'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">What's included:</h4>
                    <ul className="space-y-2">
                      {[
                        'Unlimited projects',
                        'Unlimited team members',
                        'Advanced analytics dashboard',
                        'Custom fields & templates',
                        'Export data (CSV/JSON)',
                        'API access',
                        'Priority email support',
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href="/pricing" className="flex-1">
                      <Button variant="outline" className="w-full">
                        Change Plan
                      </Button>
                    </Link>
                    <Button onClick={handleContinueToPayment} className="flex-1">
                      Continue to Payment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                  <CardDescription>
                    <Lock className="inline h-3 w-3 mr-1" />
                    Your payment information is encrypted and secure (Mock)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <AlertDescription className="text-sm">
                      <strong>Test Mode:</strong> This is a demo. No real payment will be processed.
                      Use any test card: 4242 4242 4242 4242
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={handleCompleteCheckout} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="card-number">Card Number</Label>
                      <Input
                        id="card-number"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        maxLength={19}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                          maxLength={5}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          type="password"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cardholder">Cardholder Name</Label>
                      <Input
                        id="cardholder"
                        placeholder="John Doe"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        required
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Billing Address</h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          placeholder="123 Main St"
                          value={billingAddress}
                          onChange={(e) => setBillingAddress(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            placeholder="San Francisco"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            placeholder="CA"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            maxLength={2}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zip">ZIP Code</Label>
                          <Input
                            id="zip"
                            placeholder="94102"
                            value={zip}
                            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                            maxLength={5}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setStep(1)
                          logEvent('checkout_step_back', { from_step: 2 })
                        }}
                        disabled={processing}
                        className="flex-1"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={processing}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Complete Purchase
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-center text-gray-500">
                      By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                    </p>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Premium Plan</span>
                    <span className="font-medium">${basePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Billing Cycle</span>
                    <Badge variant="secondary" className="capitalize">{cycle}</Badge>
                  </div>
                  {cycle === 'annual' && (
                    <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Annual Savings</span>
                      <span className="font-medium">-${PLAN_PRICING.premium.annualSavings.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="font-medium">${basePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax (8%)</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold">${total.toFixed(2)}</span>
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400 text-center">
                    ✓ 14-day money back guarantee
                  </p>
                </div>

                <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Cancel anytime</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>No long-term contracts</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Upgrade or downgrade anytime</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

