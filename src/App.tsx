import { useState } from 'react';
import { SignalForm } from './components/SignalForm';
import { SignalDisplay } from './components/SignalDisplay';
import { SignalResponse, SignalRequest } from './types/trading';

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
      const request: SignalRequest = {
        symbol,
        accountSize,
        tradeRiskPercent,
      };

      // VITE_API_URL should be the full URL to your backend endpoint, e.g.
      // https://ai-trading-signals-clean.vercel.app/api/generate-signal
      const apiUrl = import.meta.env.VITE_API_URL?.trim();

      if (!apiUrl) {
        setError(
          'The app is not configured with an API URL yet. Please set VITE_API_URL to your backend endpoint (for example: https://ai-trading-signals-clean.vercel.app/api/generate-signal) and rebuild the app.'
        );
        setSignalData(null);
        return;
      }

      console.log('Fetching from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to generate signal');
      }

      const data: SignalResponse = await response.json();

      // If you want to display the symbol as the user originally entered it:
      if (data?.signal) {
        data.signal.symbol = originalSymbolFormat;
      }

      setSignalData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';

      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError')
      ) {
        setError(
          `Failed to connect to API. Please check that VITE_API_URL is configured correctly. Error: ${errorMessage}`
        );
      } else {
        setError(errorMessage);
      }

      setSignalData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                On-Demand Trading Signals
              </h1>
              <p className="text-xl text-muted-foreground">
                Get instant, AI-generated trading signals tailored to your
                account size and risk tolerance. Professional-style analysis
                delivered in seconds.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-medium mb-1">AI-Powered</p>
                <p>Signals generated using AI logic, not fixed templates.</p>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-medium mb-1">Risk-Aware</p>
                <p>Position sizing based on your account size and % risk.</p>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-medium mb-1">On Demand</p>
                <p>Request a fresh signal whenever you need one.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 md:py-12">
        <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
          {/* Left: Form */}
          <div>
            <SignalForm onSubmit={handleSubmit} isLoading={isLoading} />

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Right: Signal Display */}
          <div>
            {/* IMPORTANT: pass `signalData`, not `data` */}
            <SignalDisplay signalData={signalData} />
          </div>
        </div>

        {/* Extra notes / disclaimer highlight */}
        <div className="mt-10 max-w-5xl mx-auto grid gap-6 md:grid-cols-2 text-sm text-muted-foreground">
          <div className="p-4 border rounded-lg bg-card">
            <p className="font-semibold mb-2">How it works</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Choose your instrument and account size.</li>
              <li>Set how much of your account you want to risk.</li>
              <li>
                Get entry, stop loss, and take profit levels plus position size.
              </li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <p className="font-semibold mb-2">Important</p>
            <p>
              These signals are generated automatically and are{' '}
              <span className="font-semibold">not financial advice</span>. Always
              do your own research and only risk money you can afford to lose.
            </p>
          </div>
        </div>
      </main>

      {/* Disclaimer Footer */}
      <div className="border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center max-w-4xl mx-auto">
            Disclaimer: The signals provided by this tool are for educational
            and informational purposes only and do not constitute financial
            advice. Trading involves significant risk and may result in the loss
            of your capital. Always consult with a licensed financial advisor
            before making investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
