// Google Sign-In (GIS token-popup flow) server-side verification.
// Credentials come from the Integration Settings config cache (DB-backed,
// admin-editable), not process.env — see services/integrationConfigService.js.
const { getCachedConfig } = require("./integrationConfigService");

function cfg() {
  return getCachedConfig("google");
}

function isGoogleConfigured() {
  const c = cfg();
  return Boolean(c.enabled && c.clientId);
}

// Non-secret fields only — this feeds the public /auth/social-config
// endpoint the storefront uses to show/hide the "Continue with Google"
// button, so clientSecret must never appear here.
function getPublicConfig() {
  const c = cfg();
  return { enabled: Boolean(c.enabled && c.clientId), clientId: c.enabled ? c.clientId || null : null };
}

// The frontend obtains an OAuth access token via Google Identity Services;
// this confirms Google issued it *for this app* (audience check against the
// configured Client ID) and returns the verified profile. Throws with a
// user-safe .message and .status on any failure.
async function verifyAccessToken(accessToken) {
  if (!isGoogleConfigured()) {
    const err = new Error("Google sign-in is not configured on the server");
    err.status = 503;
    throw err;
  }
  const clientId = cfg().clientId;

  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!infoRes.ok) {
    const err = new Error("Invalid or expired Google token");
    err.status = 401;
    throw err;
  }
  const tokenInfo = await infoRes.json();
  if (tokenInfo.aud !== clientId) {
    const err = new Error("Google token was not issued for this app");
    err.status = 401;
    throw err;
  }

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    const err = new Error("Could not fetch Google profile");
    err.status = 401;
    throw err;
  }
  const profile = await profileRes.json();
  if (!profile.email || profile.email_verified !== true) {
    const err = new Error("Google account email is not verified");
    err.status = 401;
    throw err;
  }
  return profile;
}

// Used by the Integration Settings "Test Connection" button. Google's OAuth
// token endpoint has no generic "check my client_id/secret" call, so this
// deliberately exchanges a bogus authorization code and inspects the error:
// - "invalid_grant" means the client authenticated fine and only the (fake)
//   code was rejected -> credentials are valid.
// - anything else ("invalid_client", 401, etc.) means the Client ID/Secret
//   pair itself is wrong.
async function testCredentials({ clientId, clientSecret }) {
  if (!clientId || !clientSecret) {
    throw new Error("Client ID and Client Secret are required");
  }
  if (!/\.apps\.googleusercontent\.com$/.test(clientId)) {
    throw new Error(`Client ID "${clientId}" looks invalid — expected it to end with .apps.googleusercontent.com`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: "invalid-test-code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: "postmessage",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));

  if (data.error === "invalid_grant") return; // client auth succeeded
  throw new Error(
    data.error_description || "Client ID / Client Secret were rejected by Google — double-check both values"
  );
}

module.exports = { isGoogleConfigured, getPublicConfig, verifyAccessToken, testCredentials };
