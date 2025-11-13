import { useState } from "react";
import SignalForm from "@/components/SignalForm";
import SignalDisplay from "@/components/SignalDisplay";
import { TradingSignal } from "@/types/trading";

export default function Index() {
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateSignal(data: { symbol: string; accountSize: number; riskPercent: number; }) {
    setIsGenerating(true);
    setSignal(null);
    const res = await fetch("/.netlify/functions/generate-signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setSignal(json as TradingSignal);
    setIsGenerating(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-sm">
            <span className="text-cyan-400">AI-Powered Trading Intelligence</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl">On-Demand Trading Signals</h1>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Get instant, AI-generated trading signals tailored to your account size and risk tolerance.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl gap-8 px-4 py-12 md:grid md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-2xl font-bold">Request Your Signal</h2>
          <p className="mb-4 text-zinc-400">Enter your trading parameters to receive a personalized signal</p>
          <SignalForm onSubmit={handleGenerateSignal} isLoading={isGenerating} />
        </div>
        <div>
          <h2 className="mb-2 text-2xl font-bold">Your AI Signal</h2>
          <p className="mb-4 text-zinc-400">
            {signal ? "Follow these levels for optimal trade execution" : "Submit the form to generate a signal"}
          </p>
          <SignalDisplay signal={signal} isLoading={isGenerating} />
        </div>

        <div className="col-span-2 mt-10 rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
          <b className="text-zinc-100">Disclaimer:</b> This is not financial advice.
        </div>
      </main>
    </div>
  );
}
