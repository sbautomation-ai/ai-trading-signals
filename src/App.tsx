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

      // Prefer a relative API URL in production/preview, but allow an explicit override for local dev
      const apiUrlFromEnv = import.meta.env.VITE_API_URL?.toString().trim();
      const apiUrl =
        apiUrlFromEnv && apiUrlFromEnv.length > 0
          ? apiUrlFromEnv
          : '/api/generate-signal';

      console.log('[SignalForm] Sending signal request', {
        apiUrl,
        symbol,
        accountSize,
        tradeRiskPercent,
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate signal';
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // ignore JSON parse errors here
        }
        throw new Error(errorMessage);
      }

      const data: SignalResponse = await response.json();
      // Update symbol to show in original format
      data.signal.symbol = originalSymbolFormat.toLowerCase();
      setSignalData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';

      console.error('[SignalForm] Error generating signal', {
        message: errorMessage,
      });

      // Provide more helpful error message if API URL might be wrong
      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError')
      ) {
        setError(
          `Failed to connect to API. If you're running locally, check VITE_API_URL in your .env.local, or ensure /api/generate-signal is reachable. Error: ${errorMessage}`
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Hero / Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                On-Demand Trading Signals
              </h1>
              <p className="text-xl text-muted-foreground">
                Get instant, AI-generated trading signals tailored to your
                account size and risk tolerance. Professional-grade analysis
                delivered in seconds.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="text-center p-6 rounded-lg border bg-card">
                <div className="text-3xl mb-3">⚡️</div>
                <h3 className="font-semibold mb-2">On-Demand Signals</h3>
                <p className="text-sm text-muted-foreground">
                  Get trading signals in seconds, not hours
                </p>
              </div>
              <div className="text-center p-6 rounded-lg border bg-card">
                <div className="text-3xl mb-3">📈</div>
                <h3 className="font-semibold mb-2">Maximize Profits</h3>
                <p className="text-sm text-muted-foreground">
                  Optimize your trading strategy for better returns
                </p>
              </div>
              <div className="text-center p-6 rounded-lg border bg-card">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="font-semibold mb-2">AI-Powered Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced AI-driven insights based on your inputs
                </p>
              </div>
            </div>

            {/* Main content grid: Form + Signal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
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
                <SignalDisplay signalData={signalData} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Footer */}
      <div className="border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center max-w-4xl mx-auto">
            Disclaimer: The signals provided are for educational purposes only
            and do not constitute financial advice. Trading involves risk, and
            you should only trade with money you can afford to lose. Past
            performance does not guarantee future results. Always do your own
            research and consider consulting a licensed financial advisor before
            making investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
