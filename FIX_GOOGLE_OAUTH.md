# Fix: Enable Google OAuth in Supabase

## Your Supabase Project
- **URL**: https://myyavhepigrtwlewhdbt.supabase.co
- **Project ID**: `myyavhepigrtwlewhdbt`

## The Problem
Error: `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`

**Cause**: Google OAuth provider is NOT enabled in your Supabase project.

---

## SOLUTION: Enable Google OAuth

### Step 1: Get Google OAuth Credentials

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. **Create a New Project**:
   - Click on project selector (top left)
   - Click "NEW PROJECT"
   - Name: `AquaSpin Rewards`
   - Click "CREATE"

3. **Enable Google+ API**:
   - Search bar → type "Google+ API"
   - Click "Google+ API"
   - Click "ENABLE"

4. **Create OAuth 2.0 Credentials**:
   - Left menu → "Credentials"
   - Click "CREATE CREDENTIALS" → "OAuth client ID"
   - If prompted: "Configure OAuth consent screen first" → click "CONFIGURE CONSENT SCREEN"
   - Choose "External" → "CREATE"
   - Fill in:
     - App name: `AquaSpin Rewards`
     - User support email: your@email.com
     - Developer contact: your@email.com
     - Click "SAVE AND CONTINUE" (skip optional scopes)
   - Back to credentials, click "CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `AquaSpin Web`

5. **Configure OAuth Redirect URIs** (in Google Console):
   - **Authorized JavaScript origins:**
     ```
     http://localhost:5173
     http://localhost:3000
     ```
   - **Authorized redirect URIs:**
     ```
     https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback
     ```
   - Click "CREATE"

6. **Copy These Values** (you'll need them):
   - **Client ID**: (looks like: `123456789-abc...apps.googleusercontent.com`)
   - **Client Secret**: (looks like: `GOCSPX-xxxx...`)

---

### Step 2: Enable Google Provider in Supabase

**MOST IMPORTANT - DO THIS NOW:**

1. Go to: https://supabase.com/dashboard
2. Select your project: `myyavhepigrtwlewhdbt`
3. Left menu → **Authentication** → **Providers**
4. Find **Google** in the list
5. Click on **Google**
6. Toggle **ENABLE** to ON
7. Paste the credentials from Google Console:
   - **Client ID**: `[paste from Google Console]`
   - **Client Secret**: `[paste from Google Console]`
8. Click **SAVE**

---

### Step 3: Configure Redirect URLs in Supabase (Usually Auto-Set)

1. Go to: https://supabase.com/dashboard/project/myyavhepigrtwlewhdbt/auth/url-configuration
2. **Site URL**: 
   - For local dev: `http://localhost:5173`
   - For production: `https://yourapp.vercel.app`
3. **Redirect URLs** should auto-populate, but verify:
   - `http://localhost:5173/**`
   - `https://yourapp.vercel.app/**` (after deployment)

---

### Step 4: Test Locally

```bash
npm run dev
# Navigate to http://localhost:5173
# Click "Continue with Google" button
# Should redirect to Google login
# After auth, should redirect to /dashboard
```

---

### Step 5: Deploy to Production

1. **Update Google Console** with your Vercel URL:
   - Go back to Google Cloud Console
   - Credentials → Your OAuth app
   - Add to **Authorized JavaScript origins**:
     ```
     https://yourapp.vercel.app
     ```
   - Add to **Authorized redirect URIs**:
     ```
     https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback
     ```

2. **Verify Vercel env vars**:
   - `VITE_SUPABASE_URL` = `https://myyavhepigrtwlewhdbt.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (your anon key)

3. **Redeploy**:
   ```bash
   git push origin master
   # Vercel will auto-deploy
   ```

---

## ✅ Verification Checklist

- [ ] Google OAuth credentials created
- [ ] Client ID copied
- [ ] Client Secret copied
- [ ] Google provider **ENABLED** in Supabase
- [ ] Credentials pasted into Supabase
- [ ] Redirect URIs configured in Google Console
- [ ] Tested locally with `npm run dev`
- [ ] Vercel env vars set correctly
- [ ] Production URL added to Google Console

---

## Troubleshooting

### Still seeing "Unsupported provider: provider is not enabled"?
→ Check that Google provider toggle is actually **ON** in Supabase
→ Refresh page and try again
→ Check Network tab in DevTools for actual error response

### "Redirect URI mismatch"?
→ Make sure this exact URL is in Google Console:
```
https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback
```
→ No trailing slash, exact match

### Works locally but not on Vercel?
→ Add your Vercel domain to Google Console Authorized JavaScript origins
→ Wait 5-10 minutes for changes to propagate

### Getting "Invalid Client"?
→ Client ID or Secret is wrong
→ Re-copy from Google Console, paste into Supabase
→ Make sure no extra spaces

---

## Code is Already Ready

Your AquaSpin code already supports Google OAuth perfectly:
- `src/pages/Auth.tsx` → "Continue with Google" button ✅
- `src/features/authStore.ts` → `loginWithGoogle()` function ✅
- Error handling ✅

**No code changes needed** — just enable the provider in Supabase!
