export type Plan = 'free' | 'premium' | 'enterprise'
export type BillingCycle = 'monthly' | 'annual'

export interface PlanLimits {
  projects: number | null // null = unlimited
  tasksPerProject: number | null
  teamMembers: number | null
  activityRetentionDays: number | null
  storageGB: number | null
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    projects: 3,
    tasksPerProject: 15,
    teamMembers: 5,
    activityRetentionDays: 30,
    storageGB: 1,
  },
  premium: {
    projects: null,
    tasksPerProject: null,
    teamMembers: null,
    activityRetentionDays: null,
    storageGB: 10,
  },
  enterprise: {
    projects: null,
    tasksPerProject: null,
    teamMembers: null,
    activityRetentionDays: null,
    storageGB: 100,
  },
}

export interface PlanPricing {
  monthly: number
  annual: number
  annualSavings: number
}

export const PLAN_PRICING: Record<Plan, PlanPricing> = {
  free: {
    monthly: 0,
    annual: 0,
    annualSavings: 0,
  },
  premium: {
    monthly: 29,
    annual: 290,
    annualSavings: 58, // 20% off
  },
  enterprise: {
    monthly: 0, // Custom pricing
    annual: 0,
    annualSavings: 0,
  },
}

export interface PlanFeature {
  name: string
  included: boolean
  premiumOnly?: boolean
  description?: string
}

export const PLAN_FEATURES: Record<Plan, PlanFeature[]> = {
  free: [
    { name: 'Up to 3 projects', included: true },
    { name: '15 tasks per project', included: true },
    { name: '5 team members', included: true },
    { name: 'Basic task management', included: true },
    { name: 'Activity feed (30 days)', included: true },
    { name: 'Mobile app access', included: true },
    { name: 'Email support', included: true },
  ],
  premium: [
    { name: 'Unlimited projects', included: true },
    { name: 'Unlimited tasks', included: true },
    { name: 'Unlimited team members', included: true },
    { name: 'Advanced analytics', included: true, premiumOnly: true },
    { name: 'Custom fields', included: true, premiumOnly: true },
    { name: 'Project templates', included: true, premiumOnly: true },
    { name: 'Bulk actions', included: true, premiumOnly: true },
    { name: 'Export data (CSV/JSON)', included: true, premiumOnly: true },
    { name: 'API access', included: true, premiumOnly: true },
    { name: 'Unlimited activity history', included: true },
    { name: '10GB file storage', included: true },
    { name: 'Priority email support', included: true },
  ],
  enterprise: [
    { name: 'Everything in Premium', included: true },
    { name: 'SSO/SAML authentication', included: true, premiumOnly: true },
    { name: 'Advanced security controls', included: true, premiumOnly: true },
    { name: 'Custom integrations', included: true, premiumOnly: true },
    { name: 'Dedicated account manager', included: true, premiumOnly: true },
    { name: 'SLA guarantees', included: true, premiumOnly: true },
    { name: 'Audit logs', included: true, premiumOnly: true },
    { name: '100GB file storage', included: true },
    { name: '24/7 phone support', included: true },
  ],
}

export interface SubscriptionEvent {
  id: string
  workspace_id: string
  user_id: string | null
  event_type: 'upgrade' | 'downgrade' | 'cancel' | 'renew' | 'started_checkout' | 'completed_checkout'
  from_plan: Plan | null
  to_plan: Plan | null
  billing_cycle: BillingCycle | null
  amount: number | null
  metadata: Record<string, any>
  created_at: string
}

export interface Invoice {
  id: string
  workspace_id: string
  invoice_number: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  billing_date: string
  plan: Plan
  billing_cycle: BillingCycle
  created_at: string
}

