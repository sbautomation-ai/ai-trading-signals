import { SignalResponse } from '../types/trading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';

interface SignalDisplayProps {
  signalData: SignalResponse | null;
}

export function SignalDisplay({ signalData }: SignalDisplayProps) {
  if (!signalData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your AI Signal</CardTitle>
          <CardDescription>
            Submit the form to generate a signal.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4 text-muted-foreground">📊</div>
            <p className="text-lg font-medium mb-2">No signal generated yet</p>
            <p className="text-sm text-muted-foreground text-center">
              Fill in the form to get your AI-powered trading signal.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { signal, positionDetails } = signalData;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPrice = (value: number) => {
    // Format with appropriate decimal places
    if (value >= 1000) {
      return value.toFixed(2);
    } else if (value >= 1) {
      return value.toFixed(5);
    } else {
      return value.toFixed(5);
    }
  };

  const formatCurrencyPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatRatio = (value: number) => {
    return value.toFixed(2);
  };

  const formatDateTime = () => {
    return new Date().toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Your AI Signal</CardTitle>
          <CardDescription>
            Follow these levels for optimal trade execution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Signal Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">{signal.symbol}</h3>
              <p className="text-sm text-muted-foreground">{formatDateTime()}</p>
            </div>
            <Badge variant={signal.direction === 'BUY' ? 'success' : 'destructive'} className="text-base px-4 py-2">
              {signal.direction === 'BUY' ? '↑' : '↓'} {signal.direction}
            </Badge>
          </div>

          {/* Order Type */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1">MARKET ORDER</p>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Entry Price</p>
              <p className="text-3xl font-bold">{formatCurrencyPrice(signal.entry)}</p>
            </div>
          </div>

          {/* Key Levels */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">〰️</span>
                <p className="text-xs font-medium">Stop Loss</p>
              </div>
              <p className="text-lg font-bold">{formatCurrencyPrice(signal.stopLoss)}</p>
            </div>
            <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">↑</span>
                <p className="text-xs font-medium">Take Profit 1</p>
              </div>
              <p className="text-lg font-bold">{formatCurrencyPrice(signal.takeProfit1)}</p>
            </div>
            <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">↑</span>
                <p className="text-xs font-medium">Take Profit 2</p>
              </div>
              <p className="text-lg font-bold">{formatCurrencyPrice(signal.takeProfit2)}</p>
            </div>
          </div>

          {/* Risk Management Note */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md flex items-start gap-2">
            <span className="text-lg">ℹ️</span>
            <p className="text-sm">
              Risk Management: When trade hits TP1, move SL to entry.
            </p>
          </div>

          {/* Recommended Lot Size */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recommended Lot Size</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-1">{positionDetails.recommendedLots.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">{positionDetails.recommendedUnits.toFixed(4)} units</p>
            </CardContent>
          </Card>

          {/* Position Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Position Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Account Size</p>
                  <p className="text-base font-semibold">{formatCurrency(positionDetails.accountSize)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Risk per Trade</p>
                  <p className="text-base font-semibold">{positionDetails.riskPerTrade}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amount Risking</p>
                  <p className="text-base font-semibold text-red-400">
                    {formatCurrency(positionDetails.amountRisking)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Profit at TP1</p>
                  <p className="text-base font-semibold text-green-400">
                    {formatCurrency(positionDetails.profitAtTP1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Profit at TP2</p>
                  <p className="text-base font-semibold text-green-400">
                    {formatCurrency(positionDetails.profitAtTP2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Risk:Reward (TP1)</p>
                  <p className="text-base font-semibold text-blue-400">
                    1:{formatRatio(positionDetails.riskRewardTP1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Risk:Reward (TP2)</p>
                  <p className="text-base font-semibold text-blue-400">
                    1:{formatRatio(positionDetails.riskRewardTP2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

