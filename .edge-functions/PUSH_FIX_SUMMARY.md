# Push Notification Fix - Summary

## ROOT CAUSE
No trigger exists on `notifications` table to send FCM push when notification is inserted.

## SOLUTION ARCHITECTURE

```
Order Created (checkout.js)
  ↓
Database Trigger: notify_admin_new_order
  ↓
INSERT into notifications table
  ↓
Database Trigger: on_notification_insert_send_push ← **THIS WAS MISSING**
  ↓
Edge Function: send-push-notification
  ↓
Firebase Admin SDK → FCM
  ↓
Push arrives at client (foreground/background handlers)
```

## CODE CHANGES

### 1. CLIENT - Token Registration (`js/core/push.js`)
**Lines 67-108**
- ✅ Added: Console log when token is generated
- ✅ Added: Console log when token is saved to Supabase
- ✅ Fixed: Token now logs user_id for debugging

**Lines 121-140**
- ✅ Added: Detailed logging in foreground push handler
- ✅ Added: Warning logs for missing notification payload
- ✅ Added: Warning logs for missing permissions

### 2. CLIENT - Order Creation (`js/pages/recibo.checkout.js`)
**Line 272**
- ✅ Added: Console log after order creation to confirm trigger execution

### 3. SERVER - Edge Function (NEW FILE)
**File: `.edge-functions/send-push-notification/index.ts`**
- ✅ Created: Complete edge function to send FCM push
- ✅ Fetches all push tokens for user_id
- ✅ Generates OAuth token using Firebase service account
- ✅ Sends push to all user tokens via FCM v1 API
- ✅ Marks notification as push_sent = true
- ✅ Includes comprehensive error handling and logging

**File: `.edge-functions/send-push-notification/deno.json`**
- ✅ Created: Deno configuration for edge function

### 4. SERVER - Database Trigger (NEW FILE)
**File: `.edge-functions/setup-trigger.sql`**
- ✅ Created: SQL script to create trigger on notifications table
- ✅ Trigger fires on INSERT when push_sent = false
- ✅ Calls send-push-notification edge function via pg_net

## DEPLOYMENT STEPS

### Step 1: Deploy Edge Function
```bash
# Option A: Supabase CLI
supabase functions deploy send-push-notification --project-ref eaipcuvvddyrqkbmjmvw

# Option B: Manual via Dashboard
# Copy contents from .edge-functions/send-push-notification/index.ts
# Paste into Supabase Dashboard → Functions → New Function
```

### Step 2: Set Firebase Service Account Secret
```bash
# Get service account JSON from Firebase Console
# Project Settings → Service Accounts → Generate New Private Key

supabase secrets set FCM_SERVICE_ACCOUNT='<JSON_CONTENT>' --project-ref eaipcuvvddyrqkbmjmvw
```

### Step 3: Create Database Trigger
```bash
# Run the SQL from .edge-functions/setup-trigger.sql
# In Supabase Dashboard → SQL Editor
```

**OR use Database Webhooks (simpler):**
1. Supabase Dashboard → Database → Webhooks
2. Create webhook:
   - Table: `notifications`
   - Events: `INSERT`
   - Type: `Supabase Edge Function`
   - Function: `send-push-notification`

## VERIFICATION

### 1. Token Registration
Open browser console after login:
```
✅ Expected logs:
🔑 Token FCM generado: eXaMpLe...
✅ Push token guardado en Supabase para user_id: <uuid>
```

### 2. Order Creation
Create an order:
```
✅ Expected logs:
✅ Pedido creado: <order_id> - Trigger debería insertar notificación
```

### 3. Push Delivery
Check Supabase Edge Function logs:
```
✅ Expected logs:
📩 Push trigger: { user_id: ..., title: ..., message: ... }
✅ Found 1 token(s) for user
🔑 OAuth token obtained
📤 Push sent: { name: "projects/.../messages/..." }
```

Check browser console:
```
✅ Expected logs:
📩 Push recibido en foreground: { notification: { title: ..., body: ... } }
🔔 Mostrando notificación: <title>
```

## DEBUG CHECKLIST

- [ ] Edge function deployed and active
- [ ] FCM_SERVICE_ACCOUNT secret set in Supabase
- [ ] Database trigger or webhook created
- [ ] User has push token in push_tokens table
- [ ] Notification inserted with push_sent = false
- [ ] Edge function logs show execution
- [ ] Edge function logs show FCM success response
- [ ] Browser console shows push received
- [ ] Browser shows notification popup

## PAYLOAD STRUCTURE

### Edge Function Input (from trigger)
```json
{
  "record": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Nuevo pedido",
    "message": "Se ha creado un nuevo pedido",
    "type": "order",
    "push_sent": false
  }
}
```

### FCM Payload (sent to Firebase)
```json
{
  "message": {
    "token": "fcm_token_here",
    "notification": {
      "title": "Nuevo pedido",
      "body": "Se ha creado un nuevo pedido"
    },
    "data": {
      "type": "order",
      "notification_id": "uuid"
    }
  }
}
```

### Client Receives (foreground)
```javascript
{
  notification: {
    title: "Nuevo pedido",
    body: "Se ha creado un nuevo pedido"
  },
  data: {
    type: "order",
    notification_id: "uuid"
  }
}
```

## FILES MODIFIED

1. `js/core/push.js` - Added debug logs for token and push reception
2. `js/pages/recibo.checkout.js` - Added debug log after order creation
3. `.edge-functions/send-push-notification/index.ts` - NEW: Edge function
4. `.edge-functions/send-push-notification/deno.json` - NEW: Deno config
5. `.edge-functions/setup-trigger.sql` - NEW: Database trigger SQL
6. `.edge-functions/DEPLOYMENT.md` - NEW: Deployment guide

## NO CHANGES MADE TO

- Firebase configuration
- Supabase schema
- Service worker (firebase-messaging-sw.js)
- Folder structure
- UI components
