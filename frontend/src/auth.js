/**
 * Google OAuth authentication module.
 *
 * Handles login/logout via Google Identity Services and stores
 * the credential + user info in localStorage.
 */

const STORAGE_KEY = "google_auth";

/**
 * Comma-separated list of authorized emails (set via VITE_ALLOWED_EMAILS).
 * If empty, any Google account can log in — leave empty only for local dev.
 */
const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

/** Check if an email is in the allowlist (or if the list is empty = open). */
function _isEmailAllowed(email) {
  if (ALLOWED_EMAILS.length === 0) return true;
  return ALLOWED_EMAILS.includes(email);
}

/** Get stored auth data (credential + user). */
function _getStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

/** Save auth data to localStorage. */
function _setStored(data) {
  if (data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Decode a JWT payload (Google ID tokens are standard JWTs). */
function _decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

/** Check if stored token is still valid (not expired). */
function _isTokenValid() {
  const stored = _getStored();
  if (!stored?.credential) return false;
  const payload = _decodeJwt(stored.credential);
  if (!payload?.exp) return false;
  // Give 60s margin
  return payload.exp * 1000 > Date.now() + 60000;
}

// --- Public API ---

/** Returns the Google ID token if logged in and valid, or null. */
export function getToken() {
  if (!_isTokenValid()) {
    _setStored(null);
    return null;
  }
  return _getStored()?.credential || null;
}

/** Returns true if the user is logged in with a valid token. */
export function isLoggedIn() {
  return Boolean(getToken());
}

/**
 * Returns true if the logged-in user is authorized to write
 * (i.e. their email is in VITE_ALLOWED_EMAILS, or the list is empty).
 */
export function isAuthorized() {
  const user = getUser();
  if (!user) return false;
  return _isEmailAllowed(user.email);
}

/** Returns stored user info { name, email, picture } or null. */
export function getUser() {
  if (!isLoggedIn()) return null;
  return _getStored()?.user || null;
}

/** Log out: clear stored data and reload. */
export function logout() {
  _setStored(null);
  // Revoke Google session
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  window.location.reload();
}

/**
 * Initialize Google Sign-In.
 * Call this once on app startup.
 * @param {string} clientId - Google OAuth Client ID
 */
export function initGoogleAuth(clientId) {
  if (!clientId || !window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleCredentialResponse,
    auto_select: true,
  });
}

/**
 * Render the Google Sign-In button into a container element.
 * @param {HTMLElement} element
 */
export function renderGoogleButton(element) {
  if (!element || !window.google?.accounts?.id) return;
  window.google.accounts.id.renderButton(element, {
    theme: "outline",
    size: "medium",
    type: "standard",
    text: "signin_with",
    shape: "pill",
    locale: "it",
  });
}

/** Internal callback when Google returns a credential. */
function handleCredentialResponse(response) {
  const credential = response.credential;
  const payload = _decodeJwt(credential);
  if (!payload) return;

  const email = payload.email || "";
  if (!_isEmailAllowed(email)) {
    // Show a brief alert then bail — don't store anything
    alert(`⛔ Account non autorizzato: ${email}`);
    window.google?.accounts?.id?.disableAutoSelect();
    return;
  }

  _setStored({
    credential,
    user: {
      name: payload.name,
      email,
      picture: payload.picture,
    },
  });

  window.location.reload();
}
