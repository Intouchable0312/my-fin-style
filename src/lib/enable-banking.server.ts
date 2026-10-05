import { importPKCS8, importSPKI, SignJWT } from "jose";

const API_ORIGIN = "https://api.enablebanking.com";

type Credentials = { applicationId: string; privateKey: string };

async function createAuthorizationToken({ applicationId, privateKey }: Credentials) {
  const normalizedKey = privateKey.replace(/\\n/g, "\n").trim();
  const algorithm = "RS256";
  const key = normalizedKey.includes("BEGIN PUBLIC KEY")
    ? await importSPKI(normalizedKey, algorithm)
    : await importPKCS8(normalizedKey, algorithm);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: algorithm, kid: applicationId, typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setIssuer(applicationId)
    .setAudience("api.enablebanking.com")
    .setJti(crypto.randomUUID())
    .sign(key);
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