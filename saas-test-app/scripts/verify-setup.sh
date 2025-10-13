#!/bin/bash
# Verify TaskFlow setup is correct

echo "🔍 TaskFlow Setup Verification"
echo "================================"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    
    # Check for required environment variables
    if grep -q "NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url" .env.local; then
        echo "❌ NEXT_PUBLIC_SUPABASE_URL is still placeholder - update with your Supabase URL"
    else
        echo "✅ NEXT_PUBLIC_SUPABASE_URL is set"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key" .env.local; then
        echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is still placeholder - update with your anon key"
    else
        echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
    fi
    
    if grep -q "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key" .env.local; then
        echo "❌ SUPABASE_SERVICE_ROLE_KEY is still placeholder - update with your service role key"
    else
        echo "✅ SUPABASE_SERVICE_ROLE_KEY is set"
    fi
else
    echo "❌ .env.local file not found"
    echo "   Run: cp .env.local.example .env.local"
fi

echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Dependencies not installed"
    echo "   Run: npm install"
fi

echo ""

# Check if schema file exists
if [ -f "supabase-schema.sql" ]; then
    echo "✅ Database schema file exists ($(wc -l < supabase-schema.sql) lines)"
else
    echo "❌ Database schema file not found"
fi

echo ""
echo "================================"
echo ""

# Check if all required vars are set
if [ -f ".env.local" ] && \
   ! grep -q "your_supabase_project_url" .env.local && \
   ! grep -q "your_supabase_anon_key" .env.local && \
   ! grep -q "your_service_role_key" .env.local && \
   [ -d "node_modules" ]; then
    echo "🎉 Setup looks good! Ready to run:"
    echo "   npm run dev"
    echo ""
    echo "Then open: http://localhost:3000"
else
    echo "⚠️  Setup incomplete. Please fix the issues above."
    echo ""
    echo "Quick setup guide:"
    echo "1. Get credentials from: https://supabase.com/dashboard/project/_/settings/api"
    echo "2. Update .env.local with your credentials"
    echo "3. Copy schema: ./scripts/copy-schema.sh"
    echo "4. Paste and run in Supabase SQL Editor"
    echo "5. Run: npm run dev"
fi

echo ""

