# Push Notification Deployment Guide

## 1. Deploy Edge Function to Supabase

You need to manually deploy the edge function using Supabase CLI or dashboard:

### Option A: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref eaipcuvvddyrqkbmjmvw

# Deploy the function
supabase functions deploy send-push-notification --project-ref eaipcuvvddyrqkbmjmvw
```

### Option B: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/eaipcuvvddyrqkbmjmvw/functions
2. Click "Create a new function"
3. Name it: `send-push-notification`
4. Copy the contents from `.edge-functions/send-push-notification/index.ts`
5. Set verify_jwt to `false` (it will be called by database trigger)
6. Deploy

### Set Environment Variable
The function needs the Firebase service account JSON. Set this secret:

```bash
supabase secrets set FCM_SERVICE_ACCOUNT='<YOUR_FIREBASE_SERVICE_ACCOUNT_JSON>' --project-ref eaipcuvvddyrqkbmjmvw
```

Get the service account JSON from:
- Firebase Console → Project Settings → Service Accounts → Generate New Private Key

## 2. Create Database Trigger

Run this SQL in Supabase SQL Editor:

```sql
-- Create trigger to call edge function when notification is inserted
CREATE OR REPLACE FUNCTION trigger_send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Call the edge function asynchronously
  SELECT http_post(
    url := 'https://eaipcuvvddyrqkbmjmvw.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'record', row_to_json(NEW)
    )
  ) INTO request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_notification_insert_send_push ON public.notifications;

-- Create trigger on notifications table
CREATE TRIGGER on_notification_insert_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.push_sent = false)
  EXECUTE FUNCTION trigger_send_push_notification();
```

**IMPORTANT:** Replace the service_role_key in the SQL above with your actual Supabase service role key, or use the http extension's built-in auth.

## 3. Verify Setup

### Test Token Registration
1. Open browser console
2. Login to the app
3. Look for: `🔑 Token FCM generado: ...`
4. Look for: `✅ Push token guardado en Supabase for user_id: ...`

### Test Notification Flow
1. Create an order
2. Check console for: `✅ Pedido creado: <order_id> - Trigger debería insertar notificación`
3. Check Supabase logs for edge function execution
4. Check browser for: `📩 Push recibido en foreground: ...`

### Debug Checklist
- [ ] FCM_SERVICE_ACCOUNT secret is set in Supabase
- [ ] Edge function is deployed and active
- [ ] Database trigger exists on notifications table
- [ ] Push token exists in push_tokens table for the user
- [ ] Notification was inserted into notifications table
- [ ] Edge function logs show successful FCM call
- [ ] Browser console shows push received

## 4. Alternative: Use Supabase Database Webhooks

If the trigger approach doesn't work, use Database Webhooks instead:

1. Go to Database → Webhooks in Supabase Dashboard
2. Create webhook:
   - Name: `send-push-on-notification`
   - Table: `notifications`
   - Events: `INSERT`
   - Type: `Supabase Edge Function`
   - Edge Function: `send-push-notification`
   - HTTP Headers: Leave default

This is simpler and doesn't require SQL triggers.
