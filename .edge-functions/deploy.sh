#!/bin/bash

# =====================================================
# PUSH NOTIFICATION DEPLOYMENT SCRIPT
# =====================================================
# This script helps deploy the push notification system
# Run from project root directory
# =====================================================

set -e

PROJECT_REF="eaipcuvvddyrqkbmjmvw"
FUNCTION_NAME="send-push-notification"

echo "🚀 Push Notification Deployment"
echo "================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found"
    echo "Install with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "🔐 Checking Supabase login..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo "Run: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Link project
echo "🔗 Linking to project..."
supabase link --project-ref $PROJECT_REF

echo ""
echo "📦 Deploying edge function: $FUNCTION_NAME"
echo ""

# Deploy function
supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF --no-verify-jwt

echo ""
echo "✅ Edge function deployed!"
echo ""

# Reminder about secrets
echo "⚠️  IMPORTANT: Set Firebase service account secret"
echo ""
echo "Run this command with your Firebase service account JSON:"
echo ""
echo "supabase secrets set FCM_SERVICE_ACCOUNT='<YOUR_JSON>' --project-ref $PROJECT_REF"
echo ""
echo "Get the JSON from:"
echo "Firebase Console → Project Settings → Service Accounts → Generate New Private Key"
echo ""

# Reminder about trigger
echo "⚠️  IMPORTANT: Create database trigger"
echo ""
echo "Option 1 (Recommended): Use Database Webhooks"
echo "  1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/database/webhooks"
echo "  2. Create webhook:"
echo "     - Table: notifications"
echo "     - Events: INSERT"
echo "     - Type: Supabase Edge Function"
echo "     - Function: $FUNCTION_NAME"
echo ""
echo "Option 2: Run SQL trigger"
echo "  Run the SQL from: .edge-functions/setup-trigger.sql"
echo "  In: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo ""

echo "✅ Deployment complete!"
echo ""
echo "📖 See PUSH_FIX_SUMMARY.md for verification steps"
