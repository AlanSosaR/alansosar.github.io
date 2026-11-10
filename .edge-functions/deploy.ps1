# =====================================================
# PUSH NOTIFICATION DEPLOYMENT SCRIPT (PowerShell)
# =====================================================
# This script helps deploy the push notification system
# Run from project root directory
# =====================================================

$ErrorActionPreference = "Stop"

$PROJECT_REF = "eaipcuvvddyrqkbmjmvw"
$FUNCTION_NAME = "send-push-notification"

Write-Host "🚀 Push Notification Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found" -ForegroundColor Red
    Write-Host "Install with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if logged in
Write-Host "🔐 Checking Supabase login..." -ForegroundColor Cyan
try {
    $null = supabase projects list 2>&1
    Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Supabase" -ForegroundColor Red
    Write-Host "Run: supabase login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Link project
Write-Host "🔗 Linking to project..." -ForegroundColor Cyan
supabase link --project-ref $PROJECT_REF

Write-Host ""
Write-Host "📦 Deploying edge function: $FUNCTION_NAME" -ForegroundColor Cyan
Write-Host ""

# Deploy function
supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF --no-verify-jwt

Write-Host ""
Write-Host "✅ Edge function deployed!" -ForegroundColor Green
Write-Host ""

# Reminder about secrets
Write-Host "⚠️  IMPORTANT: Set Firebase service account secret" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run this command with your Firebase service account JSON:" -ForegroundColor White
Write-Host ""
Write-Host "supabase secrets set FCM_SERVICE_ACCOUNT='<YOUR_JSON>' --project-ref $PROJECT_REF" -ForegroundColor Cyan
Write-Host ""
Write-Host "Get the JSON from:" -ForegroundColor White
Write-Host "Firebase Console → Project Settings → Service Accounts → Generate New Private Key" -ForegroundColor White
Write-Host ""

# Reminder about trigger
Write-Host "⚠️  IMPORTANT: Create database trigger" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1 (Recommended): Use Database Webhooks" -ForegroundColor White
Write-Host "  1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/database/webhooks" -ForegroundColor Cyan
Write-Host "  2. Create webhook:" -ForegroundColor White
Write-Host "     - Table: notifications" -ForegroundColor White
Write-Host "     - Events: INSERT" -ForegroundColor White
Write-Host "     - Type: Supabase Edge Function" -ForegroundColor White
Write-Host "     - Function: $FUNCTION_NAME" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Run SQL trigger" -ForegroundColor White
Write-Host "  Run the SQL from: .edge-functions/setup-trigger.sql" -ForegroundColor Cyan
Write-Host "  In: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📖 See PUSH_FIX_SUMMARY.md for verification steps" -ForegroundColor Cyan
