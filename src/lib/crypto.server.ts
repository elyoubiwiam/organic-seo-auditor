const enc = new TextEncoder();
const dec = new TextDecoder();

const b64u = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

function secret(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

async function aesKey() {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret("TOKEN_ENCRYPTION_KEY")));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encrypt(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), enc.encode(plain));
  return `${b64u(iv)}.${b64u(ct)}`;
}

export async function decrypt(payload: string) {
  const [iv, ct] = payload.split(".");
  if (!iv || !ct) throw new Error("Bad ciphertext");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64u(iv) }, await aesKey(), fromB64u(ct));
  return dec.decode(pt);
}

async function hmacKey() {
  return crypto.subtle.importKey("raw", enc.encode(secret("OAUTH_STATE_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signState(data: Record<string, unknown>) {
  const body = b64u(enc.encode(JSON.stringify(data)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(body));
  return `${body}.${b64u(sig)}`;
}

export async function verifyState<T>(state: string): Promise<T | null> {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(), fromB64u(sig), enc.encode(body));
  if (!ok) return null;
  return JSON.parse(dec.decode(fromB64u(body))) as T;
}
