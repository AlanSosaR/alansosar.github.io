import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    console.log('📦 FCM Payload received:', JSON.stringify(payload, null, 2));

    const notificationRecord = payload.record || payload; // Handle direct record or enveloped record

    if (!notificationRecord?.user_id) {
      console.error('⚠️ Missing user_id in record:', notificationRecord);
      return new Response(JSON.stringify({ error: 'Missing user_id', received: notificationRecord }), { status: 400 });
    }

    // Fetch push tokens
    let tokens = [];

    // CASO 1: Notificación específica a un usuario
    if (notificationRecord.user_id) {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', notificationRecord.user_id);

      if (!error && data) tokens = data;
    }
    // CASO 2: Notificación para el ADMINISTRADOR (user_id null)
    else {
      console.log('📢 Notification for ADMIN (user_id is null/missing) - Broadcasting to admins...');

      // 1. Obtener IDs de admins
      const { data: admins, error: adminErr } = await supabase
        .from('users')
        .select('id')
        .eq('rol', 'admin');

      if (!adminErr && admins && admins.length > 0) {
        const adminIds = admins.map(a => a.id);

        // 2. Obtener tokens de esos admins
        const { data: adminTokens, error: tokenErr } = await supabase
          .from('push_tokens')
          .select('token')
          .in('user_id', adminIds);

        if (!tokenErr && adminTokens) tokens = adminTokens;
      }
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No tokens found for target');
      return new Response(JSON.stringify({ message: 'No tokens found' }), { status: 200 });
    }

    console.log(`✅ Found ${tokens.length} token(s) for user ${notificationRecord.user_id}`);

    // Get Firebase service account from secrets
    const fcmSecret = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!fcmSecret) {
      throw new Error("Missing FCM_SERVICE_ACCOUNT environment variable");
    }

    const sa = JSON.parse(fcmSecret);
    // Robust private key handling: handle both already formatted and escaped keys
    const privateKey = sa.private_key.includes('\n')
      ? sa.private_key
      : sa.private_key.replace(/\\n/g, '\n');

    const now = getNumericDate(0);

    // Create JWT for OAuth
    const jwt = await create(
      { alg: "RS256", typ: "JWT" },
      {
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600
      },
      privateKey
    );

    // Get OAuth access token
    const authRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    });
    const { access_token } = await authRes.json();

    console.log('🔑 OAuth token obtained');

    // Send push to all tokens
    const results = [];
    for (const tokenRow of tokens) {
      const fcmPayload = {
        message: {
          token: tokenRow.token,
          notification: {
            title: notificationRecord.title || 'Nueva notificación',
            body: notificationRecord.body || notificationRecord.message || ''
          },
          data: {
            type: notificationRecord.type || 'info',
            notification_id: notificationRecord.id
          }
        }
      };

      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fcmPayload)
        }
      );

      const result = await res.json();
      results.push({ token: tokenRow.token.substring(0, 20) + '...', result });
      console.log('📤 Push sent:', result);
    }

    // Mark notification as push_sent
    if (notificationRecord.id) {
      await supabase
        .from('notifications')
        .update({ push_sent: true })
        .eq('id', notificationRecord.id);
    }

    return new Response(
      JSON.stringify({ success: true, sent: results.length, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Push error:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
