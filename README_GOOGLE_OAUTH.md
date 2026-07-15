# 🔐 Google OAuth Setup - START HERE

## Error: "Unsupported provider: provider is not enabled"

**Status**: ✅ FIXABLE IN 5 MINUTES

---

## YOUR QUICK ACTION PLAN

### 🎯 The Root Cause
Google OAuth provider is **disabled** in your Supabase project.

### 🚀 The 5-Minute Fix

**Step 1:** Get Google OAuth Credentials
- Go: https://console.cloud.google.com/
- Create project: "AquaSpin Rewards"
- Enable Google+ API
- Create OAuth 2.0 credentials (Web application)
- Add redirect: `https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback`
- Copy Client ID and Secret

**Step 2:** Enable in Supabase
- Go: https://supabase.com/dashboard/project/myyavhepigrtwlewhdbt/auth/providers
- Click Google provider
- Toggle ON (blue)
- Paste Client ID and Secret
- Click SAVE

**Step 3:** Test
```bash
npm run dev
# Click "Continue with Google"
```

---

## 📖 WHICH GUIDE TO READ?

1. **JUST WANT TO FIX IT NOW?** → `GOOGLE_OAUTH_QUICK_START.md` (2 min)
2. **NEED DETAILED STEPS?** → `FIX_GOOGLE_OAUTH.md` (10 min)
3. **WANT EVERYTHING?** → `GOOGLE_OAUTH_COMPLETE_FIX.md` (comprehensive)
4. **WANT AUTOMATION?** → `enable-google-oauth.ps1` (helper script)

---

## ❌ COMMON MISTAKES

1. ❌ Forgetting to toggle provider **ON** in Supabase
   ✅ Make sure Google toggle is **BLUE**

2. ❌ Not clicking **SAVE** after pasting credentials
   ✅ Always click SAVE button

3. ❌ Wrong redirect URI in Google Console
   ✅ Must be: `https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback`

4. ❌ Extra spaces in credentials
   ✅ Copy-paste directly, no extra spaces

5. ❌ Old browser cache
   ✅ Press F5 to refresh, or use incognito window

---

## ✅ VERIFICATION

When fixed, user will be able to:
1. Click "Continue with Google" button
2. Sign in with their Google account
3. Auto-create profile with 500 bonus tokens
4. Play immediately

---

## 📞 STILL NOT WORKING?

Check in this order:
1. Is Google provider toggle actually **ON** in Supabase? (blue switch)
2. Did you click **SAVE**?
3. Are credentials exactly right? (no spaces)
4. Try: Refresh page, clear cache, incognito window
5. Wait 2-3 minutes for Supabase to update

---

## 🎉 YOU GOT THIS!

The error will disappear as soon as you enable Google provider in Supabase.

All code is already ready — just need to flip the switch!

**Go to:** https://supabase.com/dashboard/project/myyavhepigrtwlewhdbt/auth/providers

**Find:** Google provider

**Click:** Toggle to ON

**Done!** ✅
