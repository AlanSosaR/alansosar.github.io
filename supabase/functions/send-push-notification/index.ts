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
        const adminIds = admins.map((a: { id: string }) => a.id);

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

    console.log(`✅ Found ${tokens.length} token(s) to notify.`);

    // Get Firebase service account from secrets
    const fcmSecret = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!fcmSecret) {
      console.error("❌ Missing FCM_SERVICE_ACCOUNT");
      throw new Error("Missing FCM_SERVICE_ACCOUNT environment variable");
    }

    console.log("🔑 Parsing FCM secret...");
    let sa;
    try {
      sa = JSON.parse(fcmSecret);
    } catch (e: any) {
      const snippet = typeof fcmSecret === 'string' ? fcmSecret.substring(0, 30) : 'not a string';
      console.error(`❌ JSON Parse Error. Secret starts with: [${snippet}]. Error: ${e.message}`);
      throw new Error(`JSON Parse Error. Secret starts with: [${snippet}]. Error: ${e.message}`);
    }

    console.log("🔑 Preparing Private Key...");
    const privateKey = sa.private_key.includes('\n')
      ? sa.private_key
      : sa.private_key.replace(/\\n/g, '\n');

    const now = getNumericDate(0);

    console.log("🔑 Importing Private Key for RS256...");
    // Convert PEM to CryptoKey
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = privateKey
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");

    // Decode base64 to array buffer
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const signingKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      true,
      ["sign"]
    );

    console.log("🔑 Creating JWT...");
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
      signingKey
    );

    console.log("🔑 Fetching OAuth token...");
    // Get OAuth access token
    const authRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    });

    const authData = await authRes.json();
    if (!authData.access_token) {
      console.error("❌ OAuth failed:", JSON.stringify(authData));
      throw new Error("OAuth failed: " + JSON.stringify(authData));
    }
    const { access_token } = authData;

    console.log('🔑 OAuth token obtained successfully');

    // Send push to all tokens
    const results = [];
    for (const tokenRow of tokens) {
      console.log(`📤 Sending to token: ${tokenRow.token.substring(0, 15)}...`);
      const fcmPayload = {
        message: {
          token: tokenRow.token,
          notification: {
            title: notificationRecord.title || 'Nueva notificación',
            body: notificationRecord.body || notificationRecord.message || ''
          },
          data: {
            type: notificationRecord.type || 'info',
            notification_id: String(notificationRecord.id || '')
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
      console.log('📤 FCM Response:', JSON.stringify(result));
    }

    // Mark notification as push_sent
    if (notificationRecord.id) {
      console.log(`✅ Updating push_sent for ID: ${notificationRecord.id}`);
      const { error: updateErr } = await supabase
        .from('notifications')
        .update({ push_sent: true })
        .eq('id', notificationRecord.id);

      if (updateErr) console.error("❌ Update push_sent error:", updateErr);
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
