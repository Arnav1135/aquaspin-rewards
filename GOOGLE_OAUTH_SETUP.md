# Google OAuth Setup for AquaSpin Rewards

## Problem
Getting error: `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`

## Solution: Enable Google OAuth in Supabase

### Step 1: Create Google OAuth Credentials

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Create a new project (or select existing):
   - Name: `AquaSpin Rewards`
   - Leave organization blank
3. Enable **Google+ API**:
   - Search for "Google+ API"
   - Click Enable
4. Create OAuth 2.0 Credentials:
   - Go to: Credentials → Create Credentials → OAuth client ID
   - Choose: **Web application**
   - Name: `AquaSpin Web`
   - **Authorized JavaScript origins:**
     - `http://localhost:5173` (local dev)
     - `http://localhost:3000` (local dev alt)
     - `https://yourdomain.com` (production)
     - `https://yourproject.vercel.app` (Vercel staging)
   - **Authorized redirect URIs:**
     - `https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback` (replace with YOUR_SUPABASE_URL)
     - `http://localhost:5173/auth/v1/callback` (local dev)
5. **Copy:**
   - Client ID (looks like: `123456789-abc...apps.googleusercontent.com`)
   - Client Secret (keep secure!)

### Step 2: Enable Google Provider in Supabase

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `myyavhepigrtwlewhdbt`
3. Go to: **Authentication → Providers**
4. Find **Google** and click **Enable**
5. Paste:
   - **Client ID**: (from Google Console)
   - **Client Secret**: (from Google Console)
6. Click **Save**

### Step 3: Configure Redirect URL in Supabase (Optional - Usually Auto)

1. In Supabase, go to: **Authentication → URL Configuration**
2. Set **Site URL** to: `https://yourdomain.com` (production)
   - For local dev, leave as http://localhost:5173
3. Add **Redirect URLs:**
   - `https://yourdomain.com/**`
   - `http://localhost:5173/**`

### Step 4: Test Locally

```bash
npm run dev
# Navigate to Auth page
# Click "Continue with Google"
# Should redirect to Google login
# After auth, should redirect back to dashboard
```

### Step 5: Deploy to Production

1. In Vercel:
   - Go to your project settings
   - Environment Variables
   - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
   - Redeploy

2. Update Google Console:
   - Add your Vercel URL to **Authorized JavaScript origins**
   - Add `https://yourdomain.com/auth/v1/callback` to **Authorized redirect URIs**

## Troubleshooting

### Error: "Unsupported provider"
→ Google provider not enabled in Supabase. Go to **Authentication → Providers** and enable Google.

### Error: "Redirect URI mismatch"
→ The callback URL in Google Console doesn't match Supabase.
- Must be: `https://<your-supabase-url>.supabase.co/auth/v1/callback`
- Check capitalization and trailing slashes

### Error: "Invalid Client"
→ Client ID or Secret is wrong. Re-copy from Google Console.

### Works Locally but not on Vercel
→ Add your Vercel domain to Google Console:
- Authorized JavaScript origins: `https://yourproject.vercel.app`
- Authorized redirect URIs: `https://yourproject.vercel.app/auth/v1/callback` (optional if you use wildcard)

## Code Changes Made

✅ Auth flow already supports Google OAuth:
- `src/pages/Auth.tsx` → "Continue with Google" button
- `src/features/authStore.ts` → `loginWithGoogle()` function
- No code changes needed — just enable provider in Supabase

## References
- Supabase Docs: https://supabase.com/docs/guides/auth/social-login/auth-google
- Google OAuth Setup: https://developers.google.com/identity/protocols/oauth2
