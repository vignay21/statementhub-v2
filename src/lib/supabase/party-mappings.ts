import { SupabaseClient } from "@supabase/supabase-js";
import { PartyMapping, StoredParty } from "@/types/transaction";

export async function fetchPartyNamesFromDB(client: SupabaseClient): Promise<string[]> {
  const namesSet = new Set<string>();

  // From party_names
  const { data: pNames } = await client.from("party_names").select("name");
  if (pNames) {
    pNames.forEach((p: any) => {
      if (p.name && p.name.trim()) namesSet.add(p.name.trim());
    });
  }

  // From party_mappings
  const { data: pMappings } = await client
    .from("party_mappings")
    .select("party_name")
    .not("match_key", "like", "__meta_%");
  if (pMappings) {
    pMappings.forEach((m: any) => {
      if (m.party_name && m.party_name.trim()) namesSet.add(m.party_name.trim());
    });
  }

  return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
}

export async function savePartyNameInDB(client: SupabaseClient, name: string): Promise<boolean> {
  const cleanName = name.trim();
  if (!cleanName) return false;

  const { error } = await client.from("party_names").upsert({ name: cleanName });
  if (error) {
    console.error("Error saving party name:", error);
    return false;
  }
  return true;
}

export async function fetchPartyMappingsFromDB(client: SupabaseClient): Promise<PartyMapping[]> {
  const { data, error } = await client
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
  client: SupabaseClient,
  matchKey: string,
  partyName: string
): Promise<boolean> {
  const { error } = await client.from("party_mappings").upsert({
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
