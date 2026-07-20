// Facebook Login server-side verification.
// Credentials come from the Integration Settings config cache (DB-backed,
// admin-editable), not process.env — see services/integrationConfigService.js.
const { getCachedConfig } = require("./integrationConfigService");

const GRAPH_VERSION = "v19.0";

function cfg() {
  return getCachedConfig("facebook");
}

function isFacebookConfigured() {
  const c = cfg();
  return Boolean(c.enabled && c.appId && c.appSecret);
}

// Non-secret fields only — appSecret must never appear here. Fed to the
// public /auth/social-config endpoint the storefront uses to show/hide the
// "Continue with Facebook" button.
function getPublicConfig() {
  const c = cfg();
  return { enabled: Boolean(c.enabled && c.appId && c.appSecret), appId: c.enabled ? c.appId || null : null };
}

// The frontend obtains a user access token via the Facebook JS SDK's
// FB.login(); this confirms the token was issued for OUR app (via
// debug_token, authenticated with our own app access token) and is still
// valid, then returns the verified profile. Throws with a user-safe
// .message and .status on any failure.
async function verifyAccessToken(userAccessToken) {
  if (!isFacebookConfigured()) {
    const err = new Error("Facebook sign-in is not configured on the server");
    err.status = 503;
    throw err;
  }
  const { appId, appSecret } = cfg();
  const appAccessToken = `${appId}|${appSecret}`;

  const debugRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/debug_token?input_token=${encodeURIComponent(userAccessToken)}&access_token=${encodeURIComponent(appAccessToken)}`
  );
  const debugData = await debugRes.json().catch(() => ({}));
  const tokenData = debugData?.data;
  if (!debugRes.ok || !tokenData?.is_valid || String(tokenData.app_id) !== String(appId)) {
    const err = new Error("Invalid or expired Facebook token");
    err.status = 401;
    throw err;
  }

  const profileRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/me?fields=id,name,email&access_token=${encodeURIComponent(userAccessToken)}`
  );
  if (!profileRes.ok) {
    const err = new Error("Could not fetch Facebook profile");
    err.status = 401;
    throw err;
  }
  const profile = await profileRes.json();
  if (!profile.email) {
    // Facebook only returns email if the user granted the permission and
    // has a verified email on file — neither is guaranteed.
    const err = new Error(
      "Your Facebook account has no email available. Please sign in with email/password or Google instead."
    );
    err.status = 422;
    throw err;
  }
  return profile;
}

// Used by the Integration Settings "Test Connection" button. This is
// Facebook's documented way for an app to verify its own App ID/Secret pair
// — requesting an app access token via the client_credentials grant.
async function testCredentials({ appId, appSecret }) {
  if (!appId || !appSecret) {
    throw new Error("App ID and App Secret are required");
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&grant_type=client_credentials`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || "App ID / App Secret were rejected by Facebook — double-check both values");
  }
}

module.exports = { isFacebookConfigured, getPublicConfig, verifyAccessToken, testCredentials };
