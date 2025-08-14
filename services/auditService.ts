import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type ContractRecord = {
  id: string;
  address: string | null;
  file_url: string | null;
  chain: string | null;
  status: string;
  created_at: string;
};

export async function createContractRecord(data: ContractRecord): Promise<boolean> {
  const { error } = await supabase.from("contracts").insert([data]);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("Supabase insert error:", error);
    return false;
  }
  return true;
}

export function enqueueAuditJob(id: string) {
  // Placeholder for actual queueing/processing logic (e.g., trigger Slither)
  // eslint-disable-next-line no-console
  console.log(`[AUDIT QUEUE] Enqueued job for contract ID: ${id}`);
}