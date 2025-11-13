import { useState } from 'react';
import { SignalForm } from './components/SignalForm';
import { SignalDisplay } from './components/SignalDisplay';
import { SignalResponse, SignalRequest } from './types/trading';

const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL
    ? String((import.meta as any).env.VITE_API_URL).replace(/\/+$/, '')
    : '';

function apiUrl(path: string) {
  if (!path.startsWith('/')) path = '/' + path;
  return `${API_BASE}${path}`;
}

function App() {
  const [signalData, setSignalData] = useState<SignalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    symbol: string,
    accountSize: number,
    tradeRiskPercent: number,
    originalSymbolFormat: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const request: SignalRequest = { symbol, accountSize, tradeRiskPercent };

      const response = await fetch(apiUrl('/api/generate-signal'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let msg = 'Failed to generate signal';
        try {
          const e = await response.json();
          if (e?.error) msg = e.error;
        } catch {}
        throw new Error(msg);
      }

      const data: SignalResponse = await response.json();
      // Preserve original user-typed symbol for display
      data.signal.symbol = originalSymbolFormat.toLowerCase();
      setSignalData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setSignalData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              On-Demand AI Trading Signals
            </h1>
            <p className="text-muted-foreground">
              Get instant, structured trading signals with risk and position sizing.
            </p>
          </div>
        </div>
      </div>

      {/* Form + Results */}
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <SignalForm onSubmit={handleSubmit} isLoading={isLoading} />

        {error && (
          <div className="mt-6 rounded-md border border-red-500/40 bg-red-900/20 p-4 text-red-200">
            {error}
          </div>
        )}

        {signalData && (
          <div className="mt-8">
            <SignalDisplay data={signalData} />
          </div>
        )}

        <p className="mt-10 text-xs text-muted-foreground text-center">
          This is not financial advice. Trading involves risk.
        </p>
      </div>
    </div>
  );
}

export default App;
