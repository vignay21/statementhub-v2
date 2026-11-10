import { extractPartyMatchKey, sanitizePartyKey } from "./party-match-key";

/**
 * Automatically resolves a party name for a transaction based on:
 * 1. Explicit party name (if already provided)
 * 2. Stored party mappings (by match_key, description, or sanitized key)
 * 3. Cash deposit narrations (e.g. "BY CASH -PARKAL SIKINDER" -> "CASH DEPOSIT")
 */
export function resolvePartyName(
  description: string,
  partyMatchKey?: string,
  partyMappings?: Record<string, string> | Map<string, string>
): string {
  const desc = (description || "").trim();
  const matchKey = (partyMatchKey || extractPartyMatchKey(desc)).trim().toUpperCase();
  const sanitizedDesc = sanitizePartyKey(desc);

  // 1. Lookup in partyMappings
  if (partyMappings) {
    const getMapping = (key: string): string | undefined => {
      if (!key) return undefined;
      const upper = key.trim().toUpperCase();
      if (partyMappings instanceof Map) {
        return partyMappings.get(upper) || partyMappings.get(key.trim());
      }
      return partyMappings[upper] || partyMappings[key.trim()];
    };

    const mapped =
      getMapping(matchKey) ||
      getMapping(desc) ||
      getMapping(sanitizedDesc);
    if (mapped) return mapped;
  }

  // 2. Explicit rule for PARKAL SIKINDER or general cash deposits
  if (/PARKAL\s+SIKINDER/i.test(desc) || /PARKAL\s+SIKINDER/i.test(matchKey)) {
    return "CASH DEPOSIT";
  }

  if (
    /^(?:BY\s+CASH|CASH\s+DEP(?:OSIT)?|CSH\s+DEP)\b/i.test(desc) ||
    /^(?:BY\s+CASH|CASH\s+DEP(?:OSIT)?|CSH\s+DEP)\b/i.test(matchKey)
  ) {
    return "CASH DEPOSIT";
  }

  // 3. Canara Bank Hanamkonda Home Loan EMI
  if (/160003276880/i.test(desc) || /Drawdown From CASA/i.test(desc)) {
    return "HNK HOME LOAN EMI";
  }

  return "";
}

