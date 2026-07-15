# Google OAuth Setup Checklist — AquaSpin Rewards

**Your Client ID:** `779832958782-qr28ucg8ipgcpefa4ido7kg7q5i9th8t.apps.googleusercontent.com`

---

## ✅ STEP 1: Get Your Client Secret (Google Cloud Console)

**Status:** ⏳ TO DO

1. Go to: https://console.cloud.google.com/
2. Make sure you're logged in with the account that owns the AquaSpin project
3. **Select the project** (top left dropdown) → `AquaSpin Rewards`
4. Left menu → **APIs & Services** → **Credentials**
5. Find your OAuth app (should say "Web application" and have a name like `AquaSpin Web`)
6. Click on it to open details
7. **Copy the Client Secret** (it looks like: `GOCSPX-xxxxx...`)
8. Store it securely — you'll need it in the next step

---

## ✅ STEP 2: Enable Google OAuth in Supabase

**Status:** ⏳ TO DO

1. Go to: https://supabase.com/dashboard
2. **Select your project:** `myyavhepigrtwlewhdbt` (AquaSpin Rewards)
3. Left menu → **Authentication** → **Providers**
4. Find **Google** and click on it
5. Toggle the switch to **ENABLE** (turn it ON — should be blue)
6. **Fill in your credentials:**
   - **Client ID (OAuth 2.0 Client ID):** 
     ```
     779832958782-qr28ucg8ipgcpefa4ido7kg7q5i9th8t.apps.googleusercontent.com
     ```
   - **Client Secret:** 
     ```
     [Paste the Client Secret you copied in Step 1]
     ```
7. Click **SAVE** (button at bottom right)
8. You should see a green checkmark or "Enabled" status

---

## ✅ STEP 3: Verify Redirect URLs in Google Cloud Console

**Status:** ⏳ TO DO

1. Go back to: https://console.cloud.google.com/
2. **APIs & Services** → **Credentials**
3. Click on your OAuth app again
4. Go to the **"URIs" section** (you might need to click "Edit OAuth client")
5. **Verify Authorized JavaScript Origins include:**
   - `http://localhost:5173` ✅
   - `http://localhost:3000` ✅
   - `https://[YOUR-VERCEL-DOMAIN].vercel.app` ✅ (e.g., `https://aquaspin-rewards.vercel.app`)

6. **Verify Authorized Redirect URIs includes:**
   - `https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback` ✅

7. If you're missing any, click **ADD URI** and add them
8. Click **SAVE** at the bottom

---

## ✅ STEP 4: Configure Redirect URLs in Supabase

**Status:** ⏳ TO DO

1. Go to: https://supabase.com/dashboard
2. Select your project: `myyavhepigrtwlewhdbt`
3. Left menu → **Authentication** → **URL Configuration**
4. **Site URL:** 
   - For **local dev:** `http://localhost:5173`
   - For **production:** `https://[YOUR-VERCEL-DOMAIN].vercel.app` (e.g., `https://aquaspin-rewards.vercel.app`)
   
   👉 **Make sure to use your actual Vercel domain!**

5. **Redirect URLs** (should auto-populate, but verify these exist):
   - `http://localhost:5173/**`
   - `https://[YOUR-VERCEL-DOMAIN].vercel.app/**`

6. Click **SAVE**

---

## ✅ STEP 5: Verify Vercel Environment Variables

**Status:** ⏳ TO DO

1. Go to: https://vercel.com/dashboard
2. Select your **AquaSpin Rewards** project
3. Go to **Settings** → **Environment Variables**
4. Verify these are set:

   | Variable | Value |
   |----------|-------|
   | `VITE_SUPABASE_URL` | `https://myyavhepigrtwlewhdbt.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `VITE_APP_URL` | Your Vercel production URL |

5. If missing any, add them
6. Click **Save**

---

## ✅ STEP 6: Redeploy on Vercel

**Status:** ⏳ TO DO

After enabling Google OAuth in Supabase, Vercel needs to redeploy with the changes.

**Option A: Manual Redeploy** (Fastest)
1. Go to: https://vercel.com/dashboard
2. Select **AquaSpin Rewards**
3. Click **Deployments** tab
4. Find your latest deployment
5. Click the **...** menu → **Redeploy**
6. Click **Redeploy** again to confirm

**Option B: Push to Git** (Automatic)
```bash
git add .
git commit -m "Enable Google OAuth"
git push origin main
# Vercel auto-deploys in ~1-2 minutes
```

---

## ✅ STEP 7: Test in Production

**Status:** ⏳ TO DO

1. Go to your Vercel URL: `https://[YOUR-VERCEL-DOMAIN].vercel.app`
2. Click **"Continue with Google"** button
3. You should be redirected to Google login
4. After logging in with your Google account, you should be redirected back to your app dashboard
5. ✅ If you see your dashboard → **Google OAuth is working!**

---

## ✅ STEP 8: Test Locally (Optional)

**Status:** ⏳ TO DO

1. In your terminal, run:
   ```bash
   npm run dev
   ```
2. Go to `http://localhost:5173`
3. Click **"Continue with Google"**
4. You should be able to log in with your Google account
5. ✅ If dashboard loads → **Local setup is working!**

---

## 🚨 TROUBLESHOOTING

### ❌ "Unsupported provider: provider is not enabled"
**Solution:** Google OAuth is not enabled in Supabase. Go to Step 2 and make sure the toggle is **ON** (blue).

### ❌ "Redirect URI mismatch"
**Solution:** The redirect URL in Google Console doesn't match. Make sure this exact URL is added:
```
https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback
```
No trailing slash, exact match.

### ❌ Works locally but not on Vercel
**Solution:** Your Vercel domain is missing from Google Console. Add it to Step 3's Authorized JavaScript Origins (e.g., `https://aquaspin-rewards.vercel.app`).

### ❌ "Invalid Client"
**Solution:** Client ID or Secret is wrong. Go back to Google Console, copy them again (no extra spaces), and re-paste into Supabase.

### ❌ Still not working after 30 minutes?
**Solution:** Google OAuth changes can take 5-10 minutes to propagate. Wait 10 minutes, then hard-refresh your browser (`Ctrl+Shift+R` or `Cmd+Shift+R`).

---

## 📋 Pre-Filled Information

- ✅ **Project ID:** `myyavhepigrtwlewhdbt`
- ✅ **Supabase URL:** `https://myyavhepigrtwlewhdbt.supabase.co`
- ✅ **Client ID:** `779832958782-qr28ucg8ipgcpefa4ido7kg7q5i9th8t.apps.googleusercontent.com`
- ⏳ **Client Secret:** (Get from Google Console in Step 1)
- ❓ **Vercel Domain:** (Replace `[YOUR-VERCEL-DOMAIN]` with your actual Vercel URL)

---

## 📝 Notes

- Your app code is **already ready** for Google OAuth
- No code changes needed — just configuration
- The "Continue with Google" button exists in your Auth page
- Supabase handles the OAuth flow automatically

---

**Last Updated:** Today
**Status:** Setup in progress
