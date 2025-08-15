import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";


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

/**
 * Asynchronously process a contract audit job by running Slither, uploading a JSON report,
 * and recording results in the `audit_results` table.
 */
export async function enqueueAuditJob(id: string) {
  try {
    // 1. Fetch contract record
    const { data: contract, error: fetchErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !contract) {
      console.error("[AUDIT] Could not fetch contract record", fetchErr);
      return;
    }

    if (!contract.file_url) {
      console.error("[AUDIT] No file_url found for contract:", id);
      return;
    }

    // Update pipeline_status: downloading
    await supabase
      .from("contracts")
      .update({ pipeline_status: "downloading" })
      .eq("id", id);

    // 2. Download the .sol file
    const filename = `${id}.sol`;
    const tmpDir = os.tmpdir();
    const localPath = path.join(tmpDir, filename);
    const fileRes = await fetch(contract.file_url);
    if (!fileRes.ok) {
      await supabase
        .from("contracts")
        .update({ pipeline_status: "download_error", status: "error" })
        .eq("id", id);
      throw new Error(`[AUDIT] Failed to download .sol file: ${fileRes.statusText}`);
    }
    // Fix: use Buffer.from(await fileRes.arrayBuffer())
    const fileBuf = Buffer.from(await fileRes.arrayBuffer());
    await fs.writeFile(localPath, fileBuf);

    // Update pipeline_status: analyzing
    await supabase
      .from("contracts")
      .update({ pipeline_status: "analyzing" })
      .eq("id", id);

    // 3. Run Slither CLI on the local file
    const slitherCmd = "slither";
    const slitherArgs = [
      "--overwrite-json",
      localPath,
      "--json",
      "slither-report.json",
      "--config-json",
      JSON.stringify({ solc: { version: "0.8.19" } })
    ];

    // Run Slither as a child process and capture output
    const slitherPromise = new Promise<{json: any, reportPath: string}>((resolve, reject) => {
      const proc = spawn(slitherCmd, slitherArgs, { cwd: tmpDir });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (data) => { stdout += data.toString(); });
      proc.stderr.on("data", (data) => { stderr += data.toString(); });
      proc.on("close", async (code) => {
        if (code !== 0) {
          await supabase
            .from("contracts")
            .update({ pipeline_status: "analysis_error", status: "error" })
            .eq("id", id);
          reject(new Error(`Slither failed: exit ${code}\n${stderr}`));
        } else {
          // Read output JSON file
          const reportPath = path.join(tmpDir, "slither-report.json");
          try {
            const jsonStr = await fs.readFile(reportPath, "utf8");
            const json = JSON.parse(jsonStr);
            resolve({ json, reportPath });
          } catch (err) {
            await supabase
              .from("contracts")
              .update({ pipeline_status: "parse_error", status: "error" })
              .eq("id", id);
            reject(new Error("Failed to read/parse Slither output: " + err));
          }
        }
      });
    });

    const { json: slitherReport, reportPath } = await slitherPromise;

    // Update pipeline_status: uploading_report
    await supabase
      .from("contracts")
      .update({ pipeline_status: "uploading_report" })
      .eq("id", id);

    // 4. Parse severity counts
    const severityCounts: Record<string, number> = {};
    if (slitherReport?.results?.detectors) {
      for (const finding of slitherReport.results.detectors) {
        const sev = finding?.impact || "Unknown";
        severityCounts[sev] = (severityCounts[sev] || 0) + 1;
      }
    }

    // 5. Upload JSON report to Supabase Storage
    const reportFileBuf = await fs.readFile(reportPath);
    const reportStoragePath = `reports/${id}.json`;
    const { error: reportUploadErr } = await supabase
      .storage
      .from("contracts")
      .upload(reportStoragePath, reportFileBuf, { upsert: true });
    if (reportUploadErr) {
      await supabase
        .from("contracts")
        .update({ pipeline_status: "upload_error", status: "error" })
        .eq("id", id);
      throw new Error("Failed to upload JSON report: " + reportUploadErr.message);
    }
    const { data: reportUrlData } = supabase
      .storage
      .from("contracts")
      .getPublicUrl(reportStoragePath);
    const report_url = reportUrlData?.publicUrl;

    // Update pipeline_status: finalizing
    await supabase
      .from("contracts")
      .update({ pipeline_status: "finalizing" })
      .eq("id", id);

    // 6. Insert into audit_results table and update contracts.status
    const { error: auditResultErr } = await supabase
      .from("audit_results")
      .insert([
        {
          id,
          severity_counts: severityCounts,
          report_url,
          completed_at: new Date().toISOString()
        }
      ]);
    if (auditResultErr) {
      await supabase
        .from("contracts")
        .update({ pipeline_status: "db_insert_error", status: "error" })
        .eq("id", id);
      throw new Error("Failed to insert audit_results: " + auditResultErr.message);
    }
    const { error: statusUpdateErr } = await supabase
      .from("contracts")
      .update({ status: "completed", pipeline_status: "completed" })
      .eq("id", id);
    if (statusUpdateErr) {
      throw new Error("Failed to update contract status: " + statusUpdateErr.message);
    }

    // Cleanup temp files
    await fs.unlink(localPath).catch(() => {});
    await fs.unlink(reportPath).catch(() => {});

    // eslint-disable-next-line no-console
    console.log(`[AUDIT] Completed Slither analysis for contract: ${id}`);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(`[AUDIT PIPELINE ERROR] ${err?.message || err}`);
  }
}
