export async function hashAccessCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`sh_auth_v1:${code.trim()}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getValidAccessCodes(): string[] {
  const raw = process.env.APP_ACCESS_CODE || "";
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

export async function isAccessCodeValid(inputCode: string): Promise<boolean> {
  const validCodes = getValidAccessCodes();
  if (validCodes.length === 0) return true; // Open access if no access code configured
  return validCodes.includes(inputCode.trim());
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  const validCodes = getValidAccessCodes();
  if (validCodes.length === 0) return true; // Open access if no code configured
  if (!token) return false;

  for (const code of validCodes) {
    const expectedToken = await hashAccessCode(code);
    if (token === expectedToken) return true;
  }
  return false;
}
