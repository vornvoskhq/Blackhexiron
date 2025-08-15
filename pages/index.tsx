import Head from "next/head";
import { NavigationMenu } from "../components/NavigationMenu";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useRef } from "react";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>("#contract-upload");
    const addressInput = form.querySelector<HTMLInputElement>('input[type="text"]');
    const file = fileInput?.files?.[0];
    const contractAddress = addressInput?.value.trim();

    let response, data;
    if (file) {
      const formData = new FormData();
      formData.append("contract", file);
      response = await fetch("/api/audit", {
        method: "POST",
        body: formData,
      });
    } else if (contractAddress) {
      response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractAddress }),
      });
    } else {
      setLoading(false);
      alert("Please upload a .sol file or enter a contract address.");
      return;
    }
    try {
      data = await response.json();
      if (response.ok && data.jobId) {
        router.push(`/audit/${data.jobId}`);
      } else {
        setLoading(false);
        alert(data.error || "Failed to start audit.");
      }
    } catch (err) {
      setLoading(false);
      alert("Unexpected error submitting audit.");
    }
  }

  return (
    <>
      <Head>
        <title>BLACKHEXIRON | Arcane DeFi Audit Engine</title>
        <meta name="description" content="BLACKHEXIRON – The arcane audit engine for the post-human financial stack. Secure. Sustainable. Antarctica-inspired." />
      </Head>
      <div className="min-h-screen bg-antarctica-dark flex flex-col">
        <NavigationMenu />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <section className="w-full flex flex-col items-center justify-center text-center py-20">
            <h1 className="text-5xl md:text-7xl font-mono font-bold text-antarctica-ice drop-shadow-glitch mb-8">
              BLACKHEXIRON
            </h1>
            <p className="text-lg md:text-2xl font-sans text-antarctica-frost max-w-2xl mb-10">
              <span className="font-mono">The arcane audit engine for the post-human financial stack.</span><br/>
              <span className="text-antarctica-glitch font-bold">"No contract is innocent. Only those that survive the hex deserve to live."</span>
            </p>
            <Button variant="glitch" className="mb-12" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              Get Started
            </Button>
            <Card className="max-w-xl w-full mx-auto mb-10">
              <h2 className="text-xl font-mono mb-4 text-antarctica-ice">Scan Your Smart Contract</h2>
              <form ref={formRef} className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <label className="text-sm font-mono text-antarctica-steel text-left" htmlFor="contract-upload">
                  Upload .sol file or paste contract address
                </label>
                <input
                  id="contract-upload"
                  type="file"
                  accept=".sol"
                  className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-mono file:bg-antarctica-steel file:text-antarctica-dark bg-antarctica-slate/30 text-antarctica-ice p-2 rounded"
                />
                <input
                  type="text"
                  placeholder="Or paste contract address (0x…)"
                  className="w-full bg-antarctica-dark text-antarctica-ice border border-antarctica-steel p-2 rounded font-mono"
                />
                <Button variant="default" type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </form>
            </Card>
            <p className="text-xs text-antarctica-steel mt-4">
              Powered by AI, forged for the Antarctic future. <span className="text-antarctica-glitch font-mono">#TechnoOccult</span>
            </p>
          </section>
        </main>
      </div>
      <style jsx global>{`
        .drop-shadow-glitch {
          text-shadow: 0 0 8px #56FFC5, 0 0 2px #8FD7FF, 2px 1px 0 #0B1C2C;
        }
      `}</style>
    </>
  );
}