import { SupabaseClient } from "@supabase/supabase-js";
import { PartyMapping } from "@/types/transaction";
import { sanitizePartyKey } from "../business/party-match-key";
import { Database } from "./types";

export async function fetchPartyNamesFromDB(
  client: SupabaseClient<Database> | SupabaseClient
): Promise<string[]> {
  const namesSet = new Set<string>();

  // Fetch all known party names directly from party_mappings (ultra-fast query)
  const { data: pMappings, error: pMappingsError } = await (client as any)
    .from("party_mappings")
    .select("party_name")
    .not("match_key", "like", "__meta_%");

  if (pMappingsError) {
    console.warn("Notice: Error fetching party mappings from DB:", pMappingsError.message);
  } else if (pMappings) {
    pMappings.forEach((m: any) => {
      if (m.party_name && m.party_name.trim()) namesSet.add(m.party_name.trim());
    });
  }

  return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
}

export async function savePartyNameInDB(
  client: SupabaseClient<Database> | SupabaseClient,
  name: string
): Promise<boolean> {
  const cleanName = name.trim();
  if (!cleanName) return false;

  const matchKey = sanitizePartyKey(cleanName);
  const { error } = await (client as any).from("party_mappings").upsert({
    match_key: matchKey,
    party_name: cleanName,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error saving party name in party_mappings:", error);
    return false;
  }
  return true;
}

export async function resetPartyNamesInDB(
  client: SupabaseClient<Database> | SupabaseClient,
  authorizedNames: string[]
): Promise<boolean> {
  try {
    await (client as any).from("party_names").delete().neq("name", "__keep__");
    const rows = authorizedNames.map((n) => ({ name: n.trim() }));
    const { error } = await (client as any).from("party_names").insert(rows);
    return !error;
  } catch (err) {
    console.error("Failed to reset party names in DB:", err);
    return false;
  }
}

export async function fetchPartyMappingsFromDB(
  client: SupabaseClient<Database> | SupabaseClient
): Promise<PartyMapping[]> {
  const { data, error } = await (client as any)
    .from("party_mappings")
    .select("*")
    .not("match_key", "like", "__meta_%");

  if (error || !data) return [];
  return data.map((d: any) => ({
    match_key: d.match_key,
    party_name: d.party_name,
    updated_at: d.updated_at,
  }));
}

export async function savePartyMappingInDB(
  client: SupabaseClient<Database> | SupabaseClient,
  matchKey: string,
  partyName: string
): Promise<boolean> {
  const { error } = await (client as any).from("party_mappings").upsert({
    match_key: matchKey,
    party_name: partyName,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error saving party mapping:", error);
    return false;
  }
  return true;
}
