#!/usr/bin/env pwsh
# auto-setup-google-oauth.ps1
# Automatically setup Google OAuth for AquaSpin
# This script uses the Supabase Access Token to enable Google provider via API

param(
    [Parameter(Mandatory=$true, HelpMessage="Supabase Access Token")]
    [string]$AccessToken,

    [Parameter(Mandatory=$false, HelpMessage="Google OAuth Client ID")]
    [string]$GoogleClientId = "",

    [Parameter(Mandatory=$false, HelpMessage="Google OAuth Client Secret")]
    [string]$GoogleClientSecret = ""
)

Write-Host "`n🔐 AquaSpin — Automatic Google OAuth Setup" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

$ProjectId = "myyavhepigrtwlewhdbt"
$SupabaseUrl = "https://$ProjectId.supabase.co"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Project: $ProjectId" -ForegroundColor Gray
Write-Host "  URL: $SupabaseUrl" -ForegroundColor Gray
Write-Host "  Token: $($AccessToken.Substring(0,10))..." -ForegroundColor Gray
Write-Host ""

# ── Step 1: Validate Access Token ──────────────────────────────────────────
Write-Host "Step 1: Validating Supabase Access Token..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

try {
    $testUri = "https://api.supabase.com/v1/projects/$ProjectId"
    $testResponse = Invoke-RestMethod -Uri $testUri -Headers $headers -Method GET -ErrorAction Stop
    Write-Host "✅ Token is valid!" -ForegroundColor Green
    Write-Host "   Project: $($testResponse.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Invalid token: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Get a new token from: https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
    exit 1
}

# ── Step 2: Check if Google credentials provided ────────────────────────────
if ($GoogleClientId -eq "" -or $GoogleClientSecret -eq "") {
    Write-Host "`nStep 2: Google OAuth Credentials Required" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You need Google OAuth credentials. Get them from:" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://console.cloud.google.com/" -ForegroundColor White
    Write-Host "  2. Create project: 'AquaSpin Rewards'" -ForegroundColor White
    Write-Host "  3. Enable Google+ API" -ForegroundColor White
    Write-Host "  4. Create OAuth 2.0 Web credentials" -ForegroundColor White
    Write-Host "  5. Add redirect URI: $SupabaseUrl/auth/v1/callback" -ForegroundColor White
    Write-Host "  6. Copy Client ID and Client Secret" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run: .\auto-setup-google-oauth.ps1 -AccessToken '$AccessToken' -GoogleClientId 'YOUR_ID' -GoogleClientSecret 'YOUR_SECRET'" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# ── Step 3: Enable Google OAuth Provider via Supabase API ──────────────────
Write-Host "Step 2: Enabling Google OAuth in Supabase..." -ForegroundColor Yellow

$payload = @{
    client_id = $GoogleClientId
    client_secret = $GoogleClientSecret
} | ConvertTo-Json

$uri = "https://api.supabase.com/v1/projects/$ProjectId/config/auth/providers/google"

try {
    Write-Host "  Sending API request to enable Google provider..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri $uri -Method PATCH -Headers $headers -Body $payload -ErrorAction Stop
    Write-Host "✅ Google OAuth Provider Enabled!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 2) -ForegroundColor Gray
} catch {
    $errorResponse = $_.Exception.Response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    Write-Host "❌ API Error: $($errorResponse.message // $_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
}

# ── Step 4: Verify it worked ───────────────────────────────────────────────
Write-Host ""
Write-Host "Step 3: Verifying Setup..." -ForegroundColor Yellow

Start-Sleep -Seconds 2

$verifyUri = "https://api.supabase.com/v1/projects/$ProjectId/config/auth/providers"

try {
    $providers = Invoke-RestMethod -Uri $verifyUri -Headers $headers -Method GET -ErrorAction Stop
    $googleProvider = $providers | Where-Object { $_.name -eq "google" }
    
    if ($googleProvider) {
        if ($googleProvider.enabled -eq $true) {
            Write-Host "✅ Google Provider is ENABLED in Supabase!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Google Provider exists but is DISABLED" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Google Provider not found in provider list" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not verify: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ── Step 5: Next Steps ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Run: npm run dev" -ForegroundColor White
Write-Host "  2. Go to: http://localhost:5173" -ForegroundColor White
Write-Host "  3. Click: 'Continue with Google'" -ForegroundColor White
Write-Host "  4. Sign in with your Google account" -ForegroundColor White
Write-Host ""
Write-Host "If still getting error:" -ForegroundColor Yellow
Write-Host "  - Refresh the page (F5)" -ForegroundColor Gray
Write-Host "  - Clear browser cache" -ForegroundColor Gray
Write-Host "  - Try incognito window" -ForegroundColor Gray
Write-Host "  - Wait 2-3 minutes for Supabase to sync" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================`n" -ForegroundColor Cyan
