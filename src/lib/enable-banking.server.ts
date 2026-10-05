import { randomUUID } from "node:crypto";

const API_ORIGIN = "https://api.enablebanking.com";

type Credentials = { applicationId: string; privateKey: string };

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

// Tolerant PEM reader: accepts PKCS#1 or PKCS#8, with lost line breaks,
// literal "\n", quotes or a bare base64 body. PKCS#1 is wrapped into PKCS#8
// so WebCrypto (available in the Worker runtime) can import it.
function derLength(len: number): number[] {
  if (len < 0x80) return [len];
  const bytes: number[] = [];
  while (len > 0) { bytes.unshift(len & 0xff); len >>= 8; }
  return [0x80 | bytes.length, ...bytes];
}

function toPkcs8Der(raw: string): Uint8Array {
  const text = raw.replace(/\\n/g, "\n").replace(/^["']|["']$/g, "").trim();
  const isPkcs1 = /BEGIN RSA PRIVATE KEY/.test(text);
  const body = text
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");
  let der: Uint8Array<ArrayBuffer> = new Uint8Array(Buffer.from(body, "base64"));
  if (der.length < 100) throw new Error("La clé privée Enable Banking est invalide ou incomplète.");
  // Detect PKCS#1 even without header: SEQUENCE { INTEGER 0, INTEGER modulus... }
  // PKCS#8 has SEQUENCE { INTEGER 0, SEQUENCE { OID ... } } -> byte after version is 0x30.
  const looksPkcs1 = (() => {
    let i = 1;
    const l = der[i] ?? 0;
    i += l & 0x80 ? 1 + (l & 0x7f) : 1;
    return der[i] === 0x02 && der[i + 2] === 0x00 && der[i + 3] === 0x02;
  })();
  if (isPkcs1 || looksPkcs1) {
    const algId = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
    const octet = [0x04, ...derLength(der.length)];
    const inner = [0x02, 0x01, 0x00, ...algId, ...octet];
    const total = inner.length + der.length;
    const out = new Uint8Array(1 + derLength(total).length + total);
    out.set([0x30, ...derLength(total), ...inner], 0);
    out.set(der, out.length - der.length);
    der = out;
  }
  return der;
}

async function createAuthorizationToken({ applicationId, privateKey }: Credentials) {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    toPkcs8Der(privateKey) as BufferSource,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", kid: applicationId, typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: applicationId,
      aud: "api.enablebanking.com",
      iat: now,
      exp: now + 3600,
      jti: randomUUID(),
    }),
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64Url(Buffer.from(sig))}`;
}

export async function enableBankingRequest<T>(
  credentials: Credentials,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await createAuthorizationToken(credentials);
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const providerMessage = await response.text();
    console.error("Enable Banking request failed", response.status, providerMessage.slice(0, 500));
    throw new Error(response.status === 401 ? "La connexion Enable Banking doit être vérifiée." : "Le service bancaire est temporairement indisponible.");
  }
  return response.json() as Promise<T>;
}

export function readEnableBankingCredentials(): Credentials {
  const applicationId = process.env['ENABLE_BANKING_APPLICATION_ID'];
  const privateKey = process.env['ENABLE_BANKING_PRIVATE_KEY'];
  if (!applicationId || !privateKey) throw new Error("Les accès Enable Banking ne sont pas configurés.");
  return { applicationId, privateKey };
}