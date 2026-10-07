const STORAGE_KEY = "mon-compte-device-access";
export function getDeviceToken(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && /^[a-f0-9]{64}$/.test(saved)) return saved;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(STORAGE_KEY, token);
  return token;
}
export function forgetDeviceToken() { localStorage.removeItem(STORAGE_KEY); }