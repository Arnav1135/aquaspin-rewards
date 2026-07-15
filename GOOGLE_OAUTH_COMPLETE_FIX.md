# ✅ Google OAuth Fix - COMPLETE GUIDE

## The Error You're Getting
```json
{
  "code": 400,
  "error_code": "validation_failed",
  "msg": "Unsupported provider: provider is not enabled"
}
```

**Translation**: Google OAuth provider is disabled in your Supabase project.

---

## 🎯 DO THIS NOW (Takes 5 minutes)

### Step 1: Go to Google Cloud Console
→ https://console.cloud.google.com/

### Step 2: Create OAuth Credentials
1. Select/Create a project: `AquaSpin Rewards`
2. Search: "Google+ API" → Enable
3. Credentials → Create OAuth 2.0 Client ID
4. Configure as "Web application"
5. **Authorized JavaScript origins:**
   - `http://localhost:5173`
   - `http://localhost:3000`
6. **Authorized redirect URIs:**
   - `https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback`
7. **COPY these values:**
   - Client ID: (looks like `123456789-abc...apps.googleusercontent.com`)
   - Client Secret: (looks like `GOCSPX-xxxx...`)

### Step 3: Enable Google in Supabase
1. Go to: https://supabase.com/dashboard/project/myyavhepigrtwlewhdbt/auth/providers
2. Find "Google" provider
3. Click to open it
4. **Toggle ENABLE to ON** (turn blue)
5. Paste credentials:
   - Client ID: `[from Google Console]`
   - Client Secret: `[from Google Console]`
6. **Click SAVE**

### Step 4: Test
```bash
npm run dev
# Go to http://localhost:5173
# Click "Continue with Google"
# Should work!
```

---

## 📚 Full Documentation

Three guides included in repo:

1. **GOOGLE_OAUTH_QUICK_START.md** ← Start here!
   - 3-minute checklist
   - Troubleshooting
   - Common errors

2. **FIX_GOOGLE_OAUTH.md** ← Detailed instructions
   - Step-by-step Google Console setup
   - Supabase configuration
   - Production deployment
   - Full verification checklist

3. **enable-google-oauth.ps1** ← Automated helper
   - Run: `.\enable-google-oauth.ps1 -GoogleClientId "..." -GoogleClientSecret "..."`
   - Attempts API automation (optional)

---

## ⚡ Quick Fixes If Still Not Working

### Problem: "Still seeing validation_failed error"
**Solution:**
1. Refresh Supabase dashboard (F5)
2. Check Google provider toggle is actually **ON** (blue)
3. Verify credentials match exactly (no extra spaces)
4. Wait 2-3 minutes for changes to propagate
5. Clear browser cache: `Ctrl+Shift+Delete` (or Cmd+Shift+Delete on Mac)

### Problem: "Works locally but not on Vercel"
**Solution:**
1. Add your Vercel URL to Google Console:
   - Authorized JavaScript origins: `https://yourapp.vercel.app`
   - Authorized redirect URIs: `https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback`
2. Ensure Vercel has env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Problem: "Redirect URI mismatch"
**Solution:**
Exact URL must be in Google Console:
```
https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback
```
- No typos
- No trailing slash
- Exact match

---

## ✅ Verification Checklist

- [ ] Google OAuth Client ID created
- [ ] Google OAuth Client Secret created
- [ ] Redirect URI added to Google Console: `https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback`
- [ ] Google provider toggle is **ON** (blue) in Supabase
- [ ] Client ID pasted into Supabase
- [ ] Client Secret pasted into Supabase
- [ ] **SAVE** clicked in Supabase
- [ ] Tested locally with `npm run dev`
- [ ] "Continue with Google" button works
- [ ] Redirects to Google login
- [ ] After auth, redirects to dashboard

---

## 🎉 When It Works

1. User clicks "Continue with Google"
2. Redirects to Google sign-in
3. User signs in with their Google account
4. Redirects back to AquaSpin dashboard
5. Profile automatically created with:
   - Email from Google account
   - 500 bonus tokens
   - Free trials enabled
6. User can play immediately

---

## 📝 Your Code is Ready

No code changes needed! Everything is implemented:

✅ **Auth Component** (`src/pages/Auth.tsx`)
- "Continue with Google" button already there
- Error handling for auth failures

✅ **Auth Store** (`src/features/authStore.ts`)
- `loginWithGoogle()` function ready
- Profile auto-creation on first login
- Session management

✅ **Error Handling**
- Toast notifications on error
- Clear error messages

Just enable the provider in Supabase!

---

## 🆘 Still Stuck?

1. **Read**: GOOGLE_OAUTH_QUICK_START.md (2 min read)
2. **Follow**: FIX_GOOGLE_OAUTH.md step-by-step
3. **Check**: Is Google toggle actually ON in Supabase?
4. **Verify**: Credentials match exactly
5. **Test**: `npm run dev` + try clicking button
6. **Debug**: Open browser DevTools → Console → check error message

**The error will disappear as soon as Google provider is enabled in Supabase!**
