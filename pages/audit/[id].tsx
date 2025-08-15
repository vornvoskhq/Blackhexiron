import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";

function formatElapsed(secs: number) {
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function Spinner({ elapsed }: { elapsed: number }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-antarctica-glitch border-t-transparent rounded-full animate-spin mb-4"></div>
      <span className="text-antarctica-steel font-mono mb-1">Running audit...</span>
      <span className="text-xs text-antarctica-steel font-mono">{formatElapsed(elapsed)}</span>
    </div>
  );
}

type AuditStatus =
  | { status: "pending"; pipelineStatus?: string }
  | { status: "completed"; severityCounts: Record<string, number>; reportUrl: string }
  | { error: string };

export default function AuditResultPage() {
  const router = useRouter();
  const { id } = router.query;
  const [audit, setAudit] = useState<AuditStatus | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);

  // Fetch audit status/results
  async function fetchAuditStatus() {
    if (!id || typeof id !== "string") return;
    const res = await fetch(`/api/audit/${id}`);
    const data = await res.json();
    if (data && data.error) {
      setPendingError(data.error);
    }
    if (data && data.pipelineStatus) {
      setPipelineStatus(data.pipelineStatus);
    }
    setAudit(data);
  }

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (audit && audit.status === "pending" && !pendingError) {
      timer = setInterval(() => setElapsed(secs => secs + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [audit, pendingError]);

  // Polling effect
  useEffect(() => {
    if (!id) return;
    let interval: NodeJS.Timeout;
    let stopped = false;
    async function poll() {
      await fetchAuditStatus();
    }
    poll();
    interval = setInterval(() => {
      setAudit((current) => {
        // If error found, stop polling
        if (
          (current && "error" in current) ||
          (current && current.status === "completed")
        ) {
          stopped = true;
          clearInterval(interval);
          return current;
        }
        if (current && current.status === "pending") {
          fetchAuditStatus();
        }
        return current;
      });
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!audit) {
    return (
      <main className="min-h-screen bg-antarctica-dark flex flex-col items-center justify-center">
        <Spinner elapsed={elapsed} />
      </main>
    );
  }

  if ("error" in audit) {
    return (
      <main className="min-h-screen bg-antarctica-dark flex flex-col items-center justify-center">
        <Card>
          <div className="text-antarctica-glitch font-mono mb-2">Audit error:</div>
          <div className="text-antarctica-steel">{audit.error}</div>
        </Card>
      </main>
    );
  }

  if (audit.status === "pending") {
    return (
      <main className="min-h-screen bg-antarctica-dark flex flex-col items-center justify-center">
        <Card>
          {pipelineStatus && (
            <div className="mb-2 text-antarctica-glitch font-mono uppercase tracking-widest">{pipelineStatus.replace(/_/g, " ")}</div>
          )}
          <Spinner elapsed={elapsed} />
          {pendingError && (
            <div className="mt-4 text-red-400 font-mono">{pendingError}</div>
          )}
        </Card>
      </main>
    );
  }

  // Completed
  const severityEntries = Object.entries(audit.severityCounts || {});

  // ZKP Compliance Proof State
  const [zkpLoading, setZkpLoading] = useState(false);
  const [zkpProof, setZkpProof] = useState<any | null>(null);
  const [zkpError, setZkpError] = useState<string | null>(null);

  async function handleGenerateProof() {
    setZkpLoading(true);
    setZkpProof(null);
    setZkpError(null);
    try {
      const response = await fetch("/api/zkp/prove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id, threshold: 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        setZkpError(data.error || "Failed to generate proof");
      } else {
        setZkpProof(data.proof);
      }
    } catch (err: any) {
      setZkpError("Unexpected error generating proof");
    } finally {
      setZkpLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-antarctica-dark flex flex-col items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <div className="mb-4">
          <h1 className="font-mono text-2xl text-antarctica-ice mb-1">Audit Results</h1>
          <div className="text-xs text-antarctica-steel mb-3">Contract ID: <span className="font-mono">{id}</span></div>
        </div>
        <div className="mb-5">
          <h2 className="text-lg font-mono text-antarctica-frost mb-2">Severity Counts</h2>
          {severityEntries.length === 0 ? (
            <div className="text-antarctica-steel">No issues found.</div>
          ) : (
            <ul className="space-y-1">
              {severityEntries.map(([sev, count]) => (
                <li key={sev} className="flex justify-between font-mono">
                  <span className={
                    sev === "High" ? "text-red-400" :
                    sev === "Medium" ? "text-yellow-400" :
                    sev === "Low" ? "text-green-400" :
                    "text-antarctica-steel"
                  }>
                    {sev}
                  </span>
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <a
          href={audit.reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-4"
        >
          <Button variant="glitch">Download Full JSON Report</Button>
        </a>

        <div className="mt-8">
          <Button variant="default" onClick={handleGenerateProof} disabled={zkpLoading}>
            {zkpLoading ? "Generating Compliance Proof..." : "Generate Compliance Proof"}
          </Button>
          {zkpLoading && (
            <div className="flex items-center justify-center mt-2">
              <div className="w-6 h-6 border-4 border-antarctica-glitch border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-xs text-antarctica-steel font-mono">Proving...</span>
            </div>
          )}
          {zkpError && (
            <div className="mt-2 text-red-400 font-mono">{zkpError}</div>
          )}
          {zkpProof && (
            <div className="mt-4">
              <div className="font-mono text-antarctica-frost mb-1">Proof:</div>
              <pre className="bg-antarctica-slate text-xs p-2 rounded">{JSON.stringify(zkpProof, null, 2)}</pre>
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}