#!/usr/bin/env pwsh
# enable-google-oauth.ps1
# Automatically enable Google OAuth in Supabase
# Prerequisites: You must have Google OAuth credentials ready
#
# Usage:
# .\enable-google-oauth.ps1 -GoogleClientId "YOUR_CLIENT_ID" -GoogleClientSecret "YOUR_CLIENT_SECRET"

param(
    [Parameter(Mandatory=$true, HelpMessage="Google OAuth Client ID from Google Console")]
    [string]$GoogleClientId,

    [Parameter(Mandatory=$true, HelpMessage="Google OAuth Client Secret from Google Console")]
    [string]$GoogleClientSecret,

    [Parameter(Mandatory=$false, HelpMessage="Supabase Access Token (get from https://supabase.com/dashboard/account/tokens)")]
    [string]$AccessToken = ""
)

Write-Host "`n🔐 AquaSpin — Google OAuth Enabler" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan

$ProjectId = "myyavhepigrtwlewhdbt"
$SupabaseUrl = "https://$ProjectId.supabase.co"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Project: $ProjectId" -ForegroundColor Gray
Write-Host "  URL: $SupabaseUrl" -ForegroundColor Gray
Write-Host ""

# ── Attempt 1: Use Access Token (if provided) ──────────────────────────────
if ($AccessToken -ne "") {
    Write-Host "📡 Attempting to enable Google OAuth via Supabase API..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $AccessToken"
        "Content-Type" = "application/json"
    }
    
    $payload = @{
        client_id = $GoogleClientId
        client_secret = $GoogleClientSecret
    } | ConvertTo-Json
    
    $uri = "https://api.supabase.com/v1/projects/$ProjectId/config/auth/providers/google"
    
    try {
        Write-Host "  Sending API request..." -ForegroundColor Gray
        $response = Invoke-RestMethod -Uri $uri -Method PATCH -Headers $headers -Body $payload -ErrorAction Stop
        Write-Host "✅ SUCCESS! Google OAuth is now enabled!" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Cyan
        Write-Host ($response | ConvertTo-Json -Depth 2) -ForegroundColor Gray
        Write-Host ""
        Write-Host "🎉 Test your app with: npm run dev" -ForegroundColor Green
        exit 0
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "⚠️  API request failed: $errorMsg" -ForegroundColor Yellow
        Write-Host "   This is OK — you can enable manually instead" -ForegroundColor Yellow
    }
}

# ── Attempt 2: Manual instructions ─────────────────────────────────────────
Write-Host "📖 Manual Setup (Takes 2 minutes):`n" -ForegroundColor Cyan

Write-Host "Step 1: Go to Supabase Dashboard" -ForegroundColor White
Write-Host "  URL: https://supabase.com/dashboard/project/$ProjectId/auth/providers" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 2: Find 'Google' in the providers list" -ForegroundColor White
Write-Host ""

Write-Host "Step 3: Toggle Google provider to ON" -ForegroundColor White
Write-Host ""

Write-Host "Step 4: Paste your Google OAuth credentials:" -ForegroundColor White
Write-Host "  Client ID:     $GoogleClientId" -ForegroundColor Gray
Write-Host "  Client Secret: $GoogleClientSecret" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 5: Click SAVE" -ForegroundColor White
Write-Host ""

Write-Host "Step 6: Test locally" -ForegroundColor White
Write-Host "  Run: npm run dev" -ForegroundColor Gray
Write-Host "  Go to: http://localhost:5173" -ForegroundColor Gray
Write-Host "  Click: 'Continue with Google'" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ After enabling, Google OAuth will work!" -ForegroundColor Green
Write-Host "   Error should disappear within 1 minute" -ForegroundColor Green
Write-Host ""

Write-Host "Need to get Access Token?" -ForegroundColor Yellow
Write-Host "  1. Go to: https://supabase.com/dashboard/account/tokens" -ForegroundColor Gray
Write-Host "  2. Create new token" -ForegroundColor Gray
Write-Host "  3. Run this script again with -AccessToken flag" -ForegroundColor Gray
Write-Host ""

Write-Host "Full guide: FIX_GOOGLE_OAUTH.md" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan
