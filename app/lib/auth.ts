const AUTH_COOKIE_NAME = "wotc_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

const encoder = new TextEncoder();

function getAuthSecret(): string {
  const secret = process.env.AUTH_PASSWORD;
  if (!secret) {
    throw new Error(
      "AUTH_PASSWORD environment variable must be set for authentication"
    );
  }
  return secret;
}

function getExpectedCredentials(): { username: string; password: string } {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "AUTH_USERNAME and AUTH_PASSWORD environment variables must be set"
    );
  }
  return { username, password };
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function verifyLoginCredentials(
  username: string,
  password: string
): boolean {
  const expected = getExpectedCredentials();
  return (
    safeCompare(username, expected.username) &&
    safeCompare(password, expected.password)
  );
}

function randomHexBytes(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function hmacSHA256(value: string): Promise<string> {
  const keyData = encoder.encode(getAuthSecret());
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  const bytes = new Uint8Array(signature);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const nonce = randomHexBytes(16);
  const payload = `${expiresAt}:${nonce}`;
  const sig = await hmacSHA256(payload);
  return `${payload}:${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;

  const [expStr, nonce, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (exp <= now) return false;

  const payload = `${expStr}:${nonce}`;
  const expectedSig = await hmacSHA256(payload);
  if (expectedSig.length !== sig.length) return false;

  let result = 0;
  for (let i = 0; i < expectedSig.length; i += 1) {
    result |= expectedSig.charCodeAt(i) ^ sig.charCodeAt(i);
  }

  return result === 0;
}

export { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };

