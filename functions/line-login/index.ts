// functions/line-login/index.ts
// LINE LIFF → Edge Function → Supabase session (no 'line' provider needed)
// Strategy:
// 1) Verify LIFF id_token with LINE Verify API
// 2) Upsert user in Supabase Auth using service role (email alias derived from LINE user id)
// 3) Sign in with password grant using derived deterministic password
// 4) Return { access_token, refresh_token, token_type, expires_in } to frontend
// SECURITY: Keep secrets in environment variables, never in client.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type VerifyResp = { iss?: string; sub?: string; aud?: string; exp?: number; iat?: number; amr?: string[]; name?: string; picture?: string; email?: string };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE")!;
const LINE_CHANNEL_ID = Deno.env.get("LINE_CHANNEL_ID")!;  // same as LIFF's channel
const EDGE_HMAC_SECRET = Deno.env.get("EDGE_HMAC_SECRET")!; // for deterministic password
const DEFAULT_ROLE = Deno.env.get("DEFAULT_ROLE") || "student";

function hmacSHA256(key: string, msg: string) {
  const enc = new TextEncoder();
  const cryptoKeyPromise = crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return cryptoKeyPromise.then(k => crypto.subtle.sign("HMAC", k, enc.encode(msg))).then(buf => {
    const b = new Uint8Array(buf);
    return Array.from(b).map(x => x.toString(16).padStart(2,"0")).join("");
  });
}

async function verifyLineIdToken(idToken: string): Promise<VerifyResp & { sub: string }> {
  const params = new URLSearchParams({ id_token: idToken, client_id: LINE_CHANNEL_ID });
  const r = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!r.ok) {
    throw new Error(`LINE verify failed: ${await r.text()}`);
  }
  const data = await r.json() as VerifyResp;
  if (!data.sub) throw new Error("Invalid id_token: missing sub");
  return data as any;
}

async function adminUpsertUser(email: string, password: string, metadata: Record<string, unknown>) {
  // Create or update user via Admin API
  // 1) try get by email
  const getRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` }
  });
  let user = null;
  if (getRes.ok) {
    const js = await getRes.json();
    if (js?.users?.length) user = js.users[0];
  }

  if (!user) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: DEFAULT_ROLE, ...metadata }
      })
    });
    if (!res.ok) throw new Error(`create user failed: ${await res.text()}`);
    user = await res.json();
  } else {
    // update metadata (optional)
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`
      },
      body: JSON.stringify({ user_metadata: { ...user.user_metadata, ...metadata } })
    });
  }
  return user;
}

async function signInPassword(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`password sign-in failed: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  try{
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: cors() });
    }
    const { id_token, display_name, user_id } = await req.json();
    if (!id_token) throw new Error("id_token required");

    const verified = await verifyLineIdToken(id_token);
    const lineSub = verified.sub; // LINE user id
    const emailAlias = `${lineSub}@line.local`; // pseudo-email for Supabase
    const password = await hmacSHA256(EDGE_HMAC_SECRET, lineSub);

    const user = await adminUpsertUser(emailAlias, password, {
      full_name: display_name || verified.name || "LINE User",
      line_user_id: user_id || lineSub,
      line_aud: verified.aud,
    });

    const tokens = await signInPassword(emailAlias, password);

    return Response.json(tokens, { headers: cors() });
  }catch(e){
    return new Response(String(e?.message || e), { status: 400, headers: cors() });
  }
});

function cors(){
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
