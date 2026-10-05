import { createPrivateKey, createSign, randomUUID } from "node:crypto";

const API_ORIGIN = "https://api.enablebanking.com";

type Credentials = { applicationId: string; privateKey: string };

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

// Node's createPrivateKey accepts PKCS#1 ("RSA PRIVATE KEY"), PKCS#8
// ("PRIVATE KEY") and SEC1 keys alike, so any PEM the user pastes works.
function createAuthorizationToken({ applicationId, privateKey }: Credentials) {
  const normalizedKey = privateKey.replace(/\\n/g, "\n").trim();
  const key = createPrivateKey({ key: normalizedKey, format: "pem" });
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
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(key, "base64url");
  return `${header}.${payload}.${signature}`;
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