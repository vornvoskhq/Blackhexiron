import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing id" });
  }

  // Fetch contract record
  const { data: contract, error: contractErr } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .single();

  if (contractErr || !contract) {
    return res.status(404).json({ error: "Not found" });
  }

  if (contract.status === "pending") {
    return res.status(200).json({ status: "pending" });
  }

  if (contract.status === "completed") {
    // Fetch audit results
    const { data: audit, error: auditErr } = await supabase
      .from("audit_results")
      .select("*")
      .eq("id", id)
      .single();
    if (auditErr || !audit) {
      return res.status(404).json({ error: "Audit result not found" });
    }
    return res.status(200).json({
      status: "completed",
      severityCounts: audit.severity_counts,
      reportUrl: audit.report_url,
    });
  }

  return res.status(500).json({ error: "Invalid contract status" });
}