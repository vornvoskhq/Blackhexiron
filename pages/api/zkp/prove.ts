import type { NextApiRequest, NextApiResponse } from "next";
import { generateProof } from "../../../services/zkpService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { jobId, threshold } = req.body || {};
  if (!jobId || typeof jobId !== "string" || !threshold || typeof threshold !== "number") {
    return res.status(400).json({ error: "Missing or invalid jobId/threshold" });
  }
  try {
    const proof = await generateProof(jobId, threshold);
    return res.status(200).json({ proof });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Proof generation failed" });
  }
}