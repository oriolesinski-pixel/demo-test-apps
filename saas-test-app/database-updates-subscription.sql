-- TaskFlow Subscription System Database Updates
-- Run this in Supabase SQL Editor to add subscription/billing features

-- Add subscription fields to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'enterprise')),
ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create subscription_events table for analytics tracking
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  from_plan TEXT,
  to_plan TEXT,
  billing_cycle TEXT,
  amount DECIMAL(10,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_workspace ON subscription_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at DESC);

-- Add RLS policy for subscription_events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their workspace subscription events" ON subscription_events;
CREATE POLICY "Users can view their workspace subscription events" ON subscription_events
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert subscription events" ON subscription_events;
CREATE POLICY "Users can insert subscription events" ON subscription_events
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Create mock invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed')),
  billing_date TIMESTAMPTZ NOT NULL,
  plan TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(billing_date DESC);

-- Add RLS policy for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their workspace invoices" ON invoices;
CREATE POLICY "Users can view their workspace invoices" ON invoices
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Seed some mock invoices for demo purposes (optional)
-- Uncomment and replace WORKSPACE_ID if you want sample data
/*
INSERT INTO invoices (workspace_id, invoice_number, amount, billing_date, plan, billing_cycle)
VALUES 
  ('WORKSPACE_ID', 'INV-2025-001', 29.00, NOW() - INTERVAL '1 month', 'premium', 'monthly'),
  ('WORKSPACE_ID', 'INV-2025-002', 29.00, NOW() - INTERVAL '2 months', 'premium', 'monthly'),
  ('WORKSPACE_ID', 'INV-2025-003', 29.00, NOW() - INTERVAL '3 months', 'premium', 'monthly');
*/

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'workspaces'
AND column_name IN ('plan', 'plan_started_at', 'billing_cycle');

-- Check new tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('subscription_events', 'invoices');

-- Success message
SELECT 
  'Subscription system database updates completed!' as message,
  'Added plan fields to workspaces' as step1,
  'Created subscription_events table' as step2,
  'Created invoices table' as step3,
  'RLS policies configured' as step4;

