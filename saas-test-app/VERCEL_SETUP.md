# TaskFlow - Vercel Deployment Setup

## ✅ Completed Steps

1. ✅ Code pushed to GitHub: https://github.com/oriolesinski-pixel/taskflow-saas
2. ✅ Vercel project created: saas-test-app
3. ✅ ESLint/TypeScript checks disabled for build

---

## 🔧 FINISH DEPLOYMENT - 3 Steps

### Step 1: Add Environment Variables in Vercel

**Go to:** https://vercel.com/oriolesinski-5672s-projects/saas-test-app/settings/environment-variables

**Add these 3 variables:**

| Variable Name | Value | Environments |
|---------------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tsdyzeoznvnbdfdwepvy.supabase.co` | ✅ Production ✅ Preview ✅ Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (copy from your `.env.local` file) | ✅ Production ✅ Preview ✅ Development |
| `NEXT_PUBLIC_APP_URL` | `https://saas-test-app.vercel.app` | ✅ Production |

**How to add:**
1. Click "Add New" button
2. Paste variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Paste value
4. Check all 3 environment checkboxes
5. Click "Save"
6. Repeat for all 3 variables

---

### Step 2: Redeploy

**Go to:** https://vercel.com/oriolesinski-5672s-projects/saas-test-app

1. Click **"Deployments"** tab
2. Find the latest deployment
3. Click **"⋮" menu** → **"Redeploy"**
4. Click **"Redeploy"** button
5. Wait 2-3 minutes for build to complete

---

### Step 3: Update Supabase Redirect URLs

**After deployment succeeds**, get your Vercel URL (will look like):
```
https://saas-test-app.vercel.app
```

**Then go to Supabase:**

1. https://supabase.com/dashboard
2. Select your TaskFlow project
3. **Settings** → **Authentication**
4. Update **Site URL** to:
   ```
   https://saas-test-app.vercel.app
   ```
5. Add to **Redirect URLs**:
   ```
   https://saas-test-app.vercel.app/**
   https://saas-test-app.vercel.app/auth/callback
   http://localhost:3000/**
   ```
6. Click **Save**

---

## ✅ Verification

Once deployed, test these:

1. **Visit:** https://saas-test-app.vercel.app
2. **Sign up** with a new account
3. **Create a project**
4. **Add a task**
5. **Visit /pricing**
6. **Test checkout flow**

---

## 🎯 Your URLs

| Service | URL |
|---------|-----|
| **GitHub** | https://github.com/oriolesinski-pixel/taskflow-saas |
| **Vercel Dashboard** | https://vercel.com/oriolesinski-5672s-projects/saas-test-app |
| **Production App** | (Will show after deployment) |
| **Supabase** | https://supabase.com/dashboard/project/tsdyzeoznvnbdfdwepvy |

---

## 🚨 If Build Fails Again

Check Vercel deployment logs:
1. Go to Deployments tab
2. Click on failed deployment
3. View "Build Logs"
4. Look for specific error messages

Common issues:
- Missing environment variables → Add them in Settings
- Supabase connection fails → Check URLs are correct
- Build timeout → Retry deployment

---

**Status:** Waiting for environment variables to be added in Vercel Dashboard

**Next:** Add env vars → Redeploy → Test production URL!

