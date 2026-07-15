#!/usr/bin/env pwsh
# setup-google-oauth.ps1
# Enable Google OAuth in Supabase
# Usage: .\setup-google-oauth.ps1 -GoogleClientId "..." -GoogleClientSecret "..."

param(
    [Parameter(Mandatory=$true, HelpMessage="Google OAuth Client ID from Google Console")]
    [string]$GoogleClientId,

    [Parameter(Mandatory=$true, HelpMessage="Google OAuth Client Secret from Google Console")]
    [string]$GoogleClientSecret,

    [Parameter(Mandatory=$false, HelpMessage="Supabase Project ID (auto-detected from .env if not provided)")]
    [string]$ProjectId = "",

    [Parameter(Mandatory=$false, HelpMessage="Supabase Access Token")]
    [string]$AccessToken = ""
)

Write-Host "`n🔐 AquaSpin — Google OAuth Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# ── Extract ProjectId from .env if not provided ───────────────────────────
if ($ProjectId -eq "") {
    Write-Host "📋 Reading Supabase URL from .env..." -ForegroundColor Yellow
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "VITE_SUPABASE_URL=https://([a-z0-9]+)\.supabase\.co") {
        $ProjectId = $matches[1]
        Write-Host "✅ Found Project ID: $ProjectId" -ForegroundColor Green
    } else {
        Write-Host "❌ Could not find VITE_SUPABASE_URL in .env" -ForegroundColor Red
        exit 1
    }
}

# ── Check if supabase-cli is installed ──────────────────────────────────────
Write-Host "`n🔍 Checking for supabase-cli..." -ForegroundColor Yellow
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue
if ($null -eq $supabaseCli) {
    Write-Host "⚠️  supabase-cli not found. Installing..." -ForegroundColor Yellow
    npm install -g supabase
}
Write-Host "✅ supabase-cli ready" -ForegroundColor Green

# ── If AccessToken provided, update Google provider via API ─────────────────
if ($AccessToken -ne "") {
    Write-Host "`n📡 Updating Google provider settings via Supabase API..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $AccessToken"
        "Content-Type" = "application/json"
    }
    
    $payload = @{
        client_id = $GoogleClientId
        client_secret = $GoogleClientSecret
    }
    
    $uri = "https://api.supabase.com/v1/projects/$ProjectId/config/auth/providers/google"
    
    try {
        $response = Invoke-RestMethod -Uri $uri -Method PATCH -Headers $headers -Body ($payload | ConvertTo-Json)
        Write-Host "✅ Google provider enabled!" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Cyan
    } catch {
        Write-Host "⚠️  API update failed (this is OK if you enable manually): $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n⚠️  No Access Token provided. You'll need to enable Google provider manually:" -ForegroundColor Yellow
}

# ── Manual setup instructions ──────────────────────────────────────────────
Write-Host "`n📖 Manual Setup Steps:" -ForegroundColor Cyan
Write-Host "1. Go to: https://supabase.com/dashboard/project/$ProjectId/auth/providers" -ForegroundColor White
Write-Host "2. Click on 'Google' provider" -ForegroundColor White
Write-Host "3. Paste these values:" -ForegroundColor White
Write-Host "   Client ID: $GoogleClientId" -ForegroundColor Gray
Write-Host "   Client Secret: $GoogleClientSecret" -ForegroundColor Gray
Write-Host "4. Click 'Save'" -ForegroundColor White
Write-Host "5. Test by running: npm run dev" -ForegroundColor White

Write-Host "`n🌐 For Production (Vercel):" -ForegroundColor Cyan
Write-Host "1. Add your Vercel URL to Google Console:" -ForegroundColor White
Write-Host "   - Authorized JavaScript origins: https://yourapp.vercel.app" -ForegroundColor Gray
Write-Host "   - Authorized redirect URIs: https://myyavhepigrtwlewhdbt.supabase.co/auth/v1/callback" -ForegroundColor Gray
Write-Host "2. Ensure Vercel has these env vars:" -ForegroundColor White
Write-Host "   - VITE_SUPABASE_URL" -ForegroundColor Gray
Write-Host "   - VITE_SUPABASE_ANON_KEY" -ForegroundColor Gray

Write-Host "`n✅ Setup guide saved to: GOOGLE_OAUTH_SETUP.md" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan
