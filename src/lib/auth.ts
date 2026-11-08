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

/**
 * Validates the passcode synchronously against configured APP_ACCESS_CODEs.
 */
export function isAccessCodeValid(inputCode: string): boolean {
  const validCodes = getValidAccessCodes();
  if (validCodes.length === 0) return true; // Open access if no access code configured
  return validCodes.includes(inputCode.trim());
}

/**
 * Constant-time string equality comparison to prevent timing attacks.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  const validCodes = getValidAccessCodes();
  if (validCodes.length === 0) return true; // Open access if no code configured
  if (!token) return false;

  for (const code of validCodes) {
    const expectedToken = await hashAccessCode(code);
    if (timingSafeEqualHex(token, expectedToken)) return true;
  }
  return false;
}
