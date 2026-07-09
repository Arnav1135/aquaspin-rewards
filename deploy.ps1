#!/usr/bin/env pwsh
# deploy.ps1 — One-click deployment script for AquaSpin Rewards
# Run this from the project root after setting up .env

param(
    [string]$SupabaseProjectRef = "",
    [string]$GitHubRepo = "aquaspin-rewards"
)

Write-Host "`n🌊 AquaSpin Rewards — Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

# ── Step 1: Check .env ──────────────────────────────────────────────────────
Write-Host "Step 1: Checking environment variables..." -ForegroundColor Yellow
$env_file = ".env"
if (-not (Test-Path $env_file)) {
    Write-Host "❌ .env file not found! Copy .env.example to .env and fill in your Supabase keys." -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $env_file -Raw
if ($envContent -match "your-project-ref" -or $envContent -match "your-anon-key-here") {
    Write-Host "❌ .env still has placeholder values!" -ForegroundColor Red
    Write-Host "   Open .env and replace:" -ForegroundColor Yellow
    Write-Host "   VITE_SUPABASE_URL=https://YOUR-REAL-PROJECT.supabase.co" -ForegroundColor White
    Write-Host "   VITE_SUPABASE_ANON_KEY=YOUR-REAL-ANON-KEY" -ForegroundColor White
    Write-Host "`n   Get these from: https://supabase.com → Your Project → Settings → API`n" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ .env looks good" -ForegroundColor Green

# ── Step 2: Build ───────────────────────────────────────────────────────────
Write-Host "`nStep 2: Building production bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Check errors above." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green

# ── Step 3: Deploy Supabase Edge Functions ───────────────────────────────────
if ($SupabaseProjectRef -ne "") {
    Write-Host "`nStep 3: Deploying Supabase Edge Functions..." -ForegroundColor Yellow
    supabase link --project-ref $SupabaseProjectRef
    supabase functions deploy spin
    supabase functions deploy cashout
    supabase functions deploy ad-reward
    Write-Host "✅ Edge functions deployed" -ForegroundColor Green
} else {
    Write-Host "`nStep 3: Skipping Edge Functions (no --SupabaseProjectRef provided)" -ForegroundColor Gray
    Write-Host "   Run manually: supabase functions deploy spin cashout ad-reward" -ForegroundColor Gray
}

# ── Step 4: Push to GitHub ───────────────────────────────────────────────────
Write-Host "`nStep 4: Pushing to GitHub..." -ForegroundColor Yellow
$ghCheck = Get-Command gh -ErrorAction SilentlyContinue
if ($ghCheck) {
    $authStatus = gh auth status 2>&1
    if ($authStatus -match "Logged in") {
        gh repo create $GitHubRepo --public --source=. --remote=origin --push 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Pushed to GitHub: https://github.com/$(gh api user --jq .login)/$GitHubRepo" -ForegroundColor Green
        } else {
            # Repo might already exist, just push
            git push origin main 2>&1
            Write-Host "✅ Pushed to existing GitHub repo" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  GitHub CLI not logged in. Run: gh auth login" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  GitHub CLI not found. Install from: https://cli.github.com" -ForegroundColor Yellow
}

# ── Step 5: Deploy to Vercel ─────────────────────────────────────────────────
Write-Host "`nStep 5: Deploying to Vercel..." -ForegroundColor Yellow
$vercelCheck = Get-Command vercel -ErrorAction SilentlyContinue
if ($vercelCheck) {
    vercel --prod 2>&1
    Write-Host "✅ Deployed to Vercel!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    vercel --prod 2>&1
}

Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Add env vars in Vercel dashboard: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY" -ForegroundColor Gray
Write-Host "  2. Run Supabase SQL schema: Copy supabase/migrations/001_schema.sql into SQL Editor" -ForegroundColor Gray
Write-Host "  3. Set VITE_MOCK_ADS=false and add real ad keys when ready" -ForegroundColor Gray
Write-Host "`n  Full guide: README.md`n" -ForegroundColor Gray
