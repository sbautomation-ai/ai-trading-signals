import { useState } from 'react';
import { SignalForm } from './components/SignalForm';
import { SignalDisplay } from './components/SignalDisplay';
import { SignalResponse, SignalRequest } from './types/trading';

function App() {
  const [signalData, setSignalData] = useState<SignalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (symbol: string, accountSize: number, tradeRiskPercent: number, originalSymbolFormat: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const request: SignalRequest = {
        symbol,
        accountSize,
        tradeRiskPercent,
      };

      const response = await fetch('/.netlify/functions/generate-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate signal');
      }

      const data: SignalResponse = await response.json();
      // Update symbol to show in original format
      data.signal.symbol = originalSymbolFormat.toLowerCase();
      setSignalData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
                Get instant, AI-generated trading signals tailored to your account size and risk tolerance. Professional-grade analysis delivered in seconds.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="text-center p-6 rounded-lg border bg-card">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-semibold mb-2">Instant Signals</h3>
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
                  Advanced algorithms analyze market conditions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

      {/* Disclaimer Footer */}
      <div className="border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center max-w-4xl mx-auto">
            Disclaimer: The signals provided are for educational and informational purposes only. This is not financial advice. Trading involves risk, and you should only trade with money you can afford to lose. Past performance does not guarantee future results. Always conduct your own research and consult with a licensed financial advisor before making investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;

