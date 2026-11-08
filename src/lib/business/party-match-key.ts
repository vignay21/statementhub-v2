/**
 * Extract normalized counterparty identifier from transaction narrations.
 */
export function extractPartyMatchKey(description: string): string {
  if (!description) return "";
  const desc = description.trim();

  // 1. UPI Slash format:
  // Format A: UPI/CR/RRN/PARTY/BANK/VPA/Remark (index 3 or 4)
  // Format B: UPI/PARTY/VPA/...
  if (desc.toUpperCase().startsWith("UPI/")) {
    const parts = desc.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 4) {
      if (/^(CR|DR)$/i.test(parts[1])) {
        // parts[0]=UPI, parts[1]=CR/DR, parts[2]=RRN, parts[3]=PARTY
        const party = parts[3];
        if (party && !/^bank\s*acco/i.test(party)) {
          return sanitizePartyKey(party);
        }
        if (parts[5]) return sanitizePartyKey(parts[5].split("@")[0]);
      } else {
        // parts[0]=UPI, parts[1]=PARTY
        return sanitizePartyKey(parts[1]);
      }
    } else if (parts.length >= 2) {
      return sanitizePartyKey(parts[1]);
    }
  }

  // 2. CLG (Cheque): CLG/PARTY/CHEQUE_NO/BANK
  if (desc.toUpperCase().startsWith("CLG/")) {
    const parts = desc.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return sanitizePartyKey(parts[1]);
    }
  }

  // 3. IMPS: INET-IMPS-CR/PARTY/... or IMPS/PARTY/...
  if (desc.toUpperCase().includes("IMPS")) {
    const parts = desc.split(/[\/-]/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (
        part.length > 2 &&
        !/^(INET|IMPS|CR|DR|P2A|RRN|\d+)$/i.test(part) &&
        !/^\d{10,}$/.test(part)
      ) {
        return sanitizePartyKey(part);
      }
    }
  }

  // 4. NEFT pattern: MB NEFT Dr <ref> <PARTY> <IFSC>
  const neftMatch = desc.match(/NEFT\s+(?:Cr|Dr)[-\s]+[A-Z0-9]+\s+([A-Za-z0-9\s]+?)(?:\s+[A-Z]{4}0[A-Z0-9]{6}|$)/i);
  if (neftMatch && neftMatch[1]) {
    return sanitizePartyKey(neftMatch[1]);
  }

  // 5. Hyphen prefix: NEFT-PARTY-..., RTGS-PARTY-...
  const hyphenMatch = desc.match(/^(?:UPI|NEFT|RTGS|IMPS)-([^-/]+)/i);
  if (hyphenMatch && hyphenMatch[1]) {
    return sanitizePartyKey(hyphenMatch[1]);
  }

  // 6. Cash deposit narrations: preserve full phrase (e.g., BY CASH -PARKAL SIKINDER)
  if (/(?:BY\s+CASH|CASH\s+DEP(?:OSIT)?|CSH\s+DEP)/i.test(desc)) {
    return sanitizePartyKey(desc);
  }

  // Fallback: take first meaningful chunk
  const chunks = desc.split(/[/:-]/).map((c) => c.trim()).filter(Boolean);
  for (const chunk of chunks) {
    if (chunk.length > 3 && !/^\d+$/.test(chunk) && !/^(TRANSFER|PAYMENT|DEPOSIT|WITHDRAWAL)$/i.test(chunk)) {
      return sanitizePartyKey(chunk);
    }
  }

  return sanitizePartyKey(desc.slice(0, 40));
}

export function sanitizePartyKey(key: string): string {
  return key
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
