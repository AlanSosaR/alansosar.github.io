# Edge Functions - Push Notifications

This directory contains the Supabase Edge Function for sending FCM push notifications.

## Quick Start

### 1. Deploy (Windows)
```powershell
cd .edge-functions
.\deploy.ps1
```

### 2. Deploy (Mac/Linux)
```bash
cd .edge-functions
chmod +x deploy.sh
./deploy.sh
```

### 3. Set Firebase Secret
```bash
supabase secrets set FCM_SERVICE_ACCOUNT='<YOUR_FIREBASE_SERVICE_ACCOUNT_JSON>' --project-ref eaipcuvvddyrqkbmjmvw
```

Get the service account JSON:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `cafecortero-eb674`
3. Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Copy the entire JSON content

### 4. Create Database Webhook (Recommended)
1. Go to [Supabase Webhooks](https://supabase.com/dashboard/project/eaipcuvvddyrqkbmjmvw/database/webhooks)
2. Click "Create a new hook"
3. Configure:
   - **Name**: `send-push-on-notification`
   - **Table**: `notifications`
   - **Events**: Check `INSERT`
   - **Type**: Select `Supabase Edge Function`
   - **Edge Function**: Select `send-push-notification`
4. Click "Create webhook"

**OR** run the SQL trigger from `setup-trigger.sql`

## Files

- **`send-push-notification/index.ts`** - Main edge function code
- **`send-push-notification/deno.json`** - Deno configuration
- **`setup-trigger.sql`** - SQL to create database trigger (alternative to webhook)
- **`deploy.sh`** - Bash deployment script (Mac/Linux)
- **`deploy.ps1`** - PowerShell deployment script (Windows)
- **`DEPLOYMENT.md`** - Detailed deployment guide
- **`PUSH_FIX_SUMMARY.md`** - Complete fix documentation

## How It Works

```
Order Created
  ↓
Trigger: notify_admin_new_order
  ↓
INSERT into notifications (push_sent = false)
  ↓
Webhook/Trigger: on_notification_insert_send_push
  ↓
Edge Function: send-push-notification
  ↓
Fetch push_tokens for user_id
  ↓
Generate OAuth token (Firebase Admin)
  ↓
Send to FCM v1 API
  ↓
Update notification (push_sent = true)
  ↓
Push arrives at client
```

## Testing

1. **Check token registration** (browser console after login):
   ```
   🔑 Token FCM generado: ...
   ✅ Push token guardado en Supabase para user_id: ...
   ```

2. **Create an order** (browser console):
   ```
   ✅ Pedido creado: <id> - Trigger debería insertar notificación
   ```

3. **Check edge function logs** (Supabase Dashboard → Functions → send-push-notification → Logs):
   ```
   📩 Push trigger: { user_id: ..., title: ..., message: ... }
   ✅ Found 1 token(s) for user
   🔑 OAuth token obtained
   📤 Push sent: { name: "..." }
   ```

4. **Check browser** (should receive push):
   ```
   📩 Push recibido en foreground: ...
   🔔 Mostrando notificación: ...
   ```

## Troubleshooting

### No push received?

1. **Check token exists**:
   ```sql
   SELECT * FROM push_tokens WHERE user_id = '<your_user_id>';
   ```

2. **Check notification was inserted**:
   ```sql
   SELECT * FROM notifications WHERE user_id = '<your_user_id>' ORDER BY created_at DESC LIMIT 5;
   ```

3. **Check edge function logs** in Supabase Dashboard

4. **Check browser console** for errors

5. **Verify webhook/trigger exists**:
   ```sql
   SELECT trigger_name FROM information_schema.triggers 
   WHERE event_object_table = 'notifications';
   ```

### Edge function fails?

1. **Verify FCM_SERVICE_ACCOUNT secret is set**:
   ```bash
   supabase secrets list --project-ref eaipcuvvddyrqkbmjmvw
   ```

2. **Check the JSON is valid** (no extra quotes, proper escaping)

3. **Verify Firebase project ID** matches in service account JSON

### Token not saving?

1. **Check notification permissions** are granted in browser
2. **Check service worker** is registered: `navigator.serviceWorker.getRegistration()`
3. **Check Supabase client** is initialized: `window.supabaseClient`

## Support

See `PUSH_FIX_SUMMARY.md` for complete documentation.
