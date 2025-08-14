import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import formidable, { File } from "formidable";
import { v4 as uuidv4 } from "uuid";
import { enqueueAuditJob, createContractRecord } from "../../services/auditService";
import { promises as fs } from "fs";

// Don't parse the body by default (for multipart)
export const config = {
  api: {
    bodyParser: false,
  },
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type Data =
  | { jobId: string; status: string }
  | { ok: boolean }
  | { error: string };

async function parseForm(req: NextApiRequest): Promise<{ file?: File; fields?: formidable.Fields }> {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      const file = files.contract as File | undefined;
      resolve({ file, fields });
    });
  });
}

async function fsReadFileAsync(path: string): Promise<Buffer> {
  return fs.readFile(path);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method === "GET") {
    // Sanity check endpoint
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (req.headers["content-type"]?.includes("multipart/form-data")) {
      // Handle file upload
      const { file, fields } = await parseForm(req);
      if (!file || !file.originalFilename?.endsWith(".sol")) {
        return res.status(400).json({ error: "No valid .sol file uploaded" });
      }

      const id = uuidv4();
      const fileBuffer = await fsReadFileAsync(file.filepath);
      const storagePath = `${id}.sol`;

      // Upload to Supabase Storage
      const { data: storageResult, error: uploadError } = await supabase
        .storage
        .from("contracts")
        .upload(storagePath, fileBuffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: "text/plain"
        });

      if (uploadError) {
        return res.status(500).json({ error: "Failed to upload file" });
      }

      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from("contracts")
        .getPublicUrl(storagePath);
      const file_url = publicUrlData?.publicUrl;

      // Insert to DB
      const record = {
        id,
        address: null,
        file_url,
        chain: null,
        status: "pending",
        created_at: new Date().toISOString()
      };
      const insertResult = await createContractRecord(record);
      if (!insertResult) {
        return res.status(500).json({ error: "Failed to create contract record" });
      }

      enqueueAuditJob(id);
      return res.status(200).json({ jobId: id, status: "pending" });
    } else {
      // Handle JSON body
      if (req.headers["content-type"] !== "application/json") {
        return res.status(400).json({ error: "Unsupported content type" });
      }
      const { contractAddress } = req.body || {};
      if (!contractAddress || typeof contractAddress !== "string" || !contractAddress.startsWith("0x")) {
        return res.status(400).json({ error: "Invalid contractAddress" });
      }
      const id = uuidv4();

      const record = {
        id,
        address: contractAddress,
        file_url: null,
        chain: null,
        status: "pending",
        created_at: new Date().toISOString()
      };
      const insertResult = await createContractRecord(record);
      if (!insertResult) {
        return res.status(500).json({ error: "Failed to create contract record" });
      }

      enqueueAuditJob(id);
      return res.status(200).json({ jobId: id, status: "pending" });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}