# TaskFlow - Deployment Guide

## 🚀 Production Deployment

**GitHub Repository:** https://github.com/oriolesinski-pixel/taskflow-saas  
**Production URL:** (Will be updated after Vercel deployment)

---

## ✅ Deployment Checklist

### Pre-Deployment (Completed)
- ✅ Code pushed to GitHub
- ✅ `.gitignore` configured
- ✅ Environment variables template (`.env.example`)
- ✅ Database schema ready (`supabase-schema.sql`)

### Vercel Deployment (In Progress)
- [ ] Import repository to Vercel
- [ ] Add environment variables
- [ ] Deploy application
- [ ] Update Supabase redirect URLs
- [ ] Test production deployment

---

## 🔧 Environment Variables for Vercel

**Add these in Vercel Dashboard:**

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://tsdyzeoznvnbdfdwepvy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your_anon_key]
NEXT_PUBLIC_APP_URL=[will_be_vercel_url]

# Optional
SUPABASE_SERVICE_ROLE_KEY=[your_service_role_key]
```

**Important:** 
- Check "Production", "Preview", and "Development" for all variables
- `NEXT_PUBLIC_APP_URL` will be updated after first deployment

---

## 📝 Supabase Configuration Updates

After deploying to Vercel, update these settings in Supabase Dashboard:

### Authentication > URL Configuration

**Site URL:**
```
https://your-app.vercel.app
```

**Redirect URLs (add these):**
```
https://your-app.vercel.app/**
https://your-app.vercel.app/auth/callback
http://localhost:3000/**
http://localhost:3000/auth/callback
```

---

## 🧪 Testing Production Deployment

### Critical Tests
1. ✅ Homepage loads
2. ✅ Signup creates new user
3. ✅ Login works
4. ✅ Can create project
5. ✅ Can create task
6. ✅ Pricing page loads
7. ✅ Checkout flow works
8. ✅ Billing page displays

### Performance Tests
- Initial page load < 3 seconds
- No console errors
- Images load correctly
- Styles applied properly

---

## 🔄 Continuous Deployment

**Auto-Deploy Configured:**
- Push to `main` branch → Production deployment
- Pull requests → Preview deployments
- Commits to feature branches → No deployment

**Manual Deploy:**
```bash
vercel --prod
```

**Rollback:**
1. Go to Vercel Dashboard > Deployments
2. Find previous working deployment
3. Click "Promote to Production"

---

## 📊 Monitoring

**Vercel Dashboard:**
- Deployment logs
- Function logs
- Analytics (optional)
- Error tracking

**Supabase Dashboard:**
- Database logs
- Auth logs
- API usage
- Performance metrics

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Check logs in Vercel Dashboard
# Common fixes:
npm install
npm run build  # Test locally first
```

### Auth Not Working
- Check Supabase redirect URLs
- Verify environment variables in Vercel
- Check Site URL in Supabase

### Database Queries Fail
- Verify RLS policies
- Check environment variables
- Test queries in Supabase SQL Editor

---

**Last Updated:** $(date)

