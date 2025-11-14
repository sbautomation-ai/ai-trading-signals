import { useState, FormEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

interface SignalFormProps {
  onSubmit: (symbol: string, accountSize: number, tradeRiskPercent: number, originalSymbol: string) => void;
  isLoading: boolean;
}

const TRADING_SYMBOLS = {
  Indices: [
    { value: 'SPX500', label: 'SPX500 (S&P 500)' },
    { value: 'US100', label: 'US100 (Nasdaq)' },
    { value: 'US30', label: 'US30 (Dow Jones)' },
  ],
  Crypto: [
    { value: 'BTCUSD', label: 'BTCUSD' },
    { value: 'BTCEUR', label: 'BTCEUR' },
    { value: 'ETHUSD', label: 'ETHUSD' },
    { value: 'LTCUSD', label: 'LTCUSD' },
    { value: 'XRPUSD', label: 'XRPUSD' },
  ],
  Metals: [
    { value: 'XAUUSD', label: 'XAUUSD' },
    { value: 'XAGUSD', label: 'XAGUSD' },
    { value: 'XPDUSD', label: 'XPDUSD' },
  ],
  'Forex Majors': [
    { value: 'AUDCAD', label: 'AUDCAD' },
    { value: 'AUDCHF', label: 'AUDCHF' },
    { value: 'AUDJPY', label: 'AUDJPY' },
    { value: 'AUDNZD', label: 'AUDNZD' },
    { value: 'AUDUSD', label: 'AUDUSD' },
    { value: 'CADCHF', label: 'CADCHF' },
    { value: 'CADJPY', label: 'CADJPY' },
    { value: 'CHFJPY', label: 'CHFJPY' },
    { value: 'EURAUD', label: 'EURAUD' },
    { value: 'EURCAD', label: 'EURCAD' },
    { value: 'EURCHF', label: 'EURCHF' },
    { value: 'EURGBP', label: 'EURGBP' },
    { value: 'EURJPY', label: 'EURJPY' },
    { value: 'EURNZD', label: 'EURNZD' },
    { value: 'EURUSD', label: 'EURUSD' },
    { value: 'GBPAUD', label: 'GBPAUD' },
    { value: 'GBPCAD', label: 'GBPCAD' },
    { value: 'GBPCHF', label: 'GBPCHF' },
    { value: 'GBPJPY', label: 'GBPJPY' },
    { value: 'GBPNZD', label: 'GBPNZD' },
    { value: 'GBPUSD', label: 'GBPUSD' },
    { value: 'NZDCAD', label: 'NZDCAD' },
    { value: 'NZDCHF', label: 'NZDCHF' },
    { value: 'NZDJPY', label: 'NZDJPY' },
    { value: 'NZDUSD', label: 'NZDUSD' },
    { value: 'USDCAD', label: 'USDCAD' },
    { value: 'USDCHF', label: 'USDCHF' },
    { value: 'USDJPY', label: 'USDJPY' },
  ],
};

// Helper to approximate if the market is open for the selected symbol.
// - Crypto (BTC/ETH/LTC/XRP) is treated as 24/7 open.
// - Other instruments: open Mon–Fri between 08:00 and 22:00 local time.
function getMarketStatus(symbolRaw: string): { isOpen: boolean; message: string | null } {
  const trimmed = symbolRaw.trim();
  if (!trimmed) {
    return { isOpen: true, message: null };
  }

  const symbol = trimmed.toUpperCase();
  const isCrypto =
    symbol.includes('BTC') ||
    symbol.includes('ETH') ||
    symbol.includes('LTC') ||
    symbol.includes('XRP');

  if (isCrypto) {
    return {
      isOpen: true,
      message: 'Crypto markets generally trade 24/7.',
    };
  }

  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();

  const isWeekend = day === 0 || day === 6;
  if (isWeekend) {
    return {
      isOpen: false,
      message:
        'Market appears to be closed for this instrument (weekend). Signals may not be immediately tradeable.',
    };
  }

  const withinSession = hour >= 8 && hour < 22;
  if (!withinSession) {
    return {
      isOpen: false,
      message:
        'Market appears to be closed for this instrument (outside typical weekday hours). Signals may not be immediately tradeable.',
    };
  }

  return { isOpen: true, message: null };
}

export function SignalForm({ onSubmit, isLoading }: SignalFormProps) {
  const [symbol, setSymbol] = useState('XAUUSD');
  const [accountSize, setAccountSize] = useState('10000');
  const [tradeRiskPercent, setTradeRiskPercent] = useState('2');

  // Derived values for warnings (do NOT affect submission logic)
  const riskNumForDisplay = parseFloat(tradeRiskPercent || '0');
  const isHighRisk = riskNumForDisplay > 3;

  const marketStatus = getMarketStatus(symbol);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const accountSizeNum = parseFloat(accountSize);
    const riskNum = parseFloat(tradeRiskPercent);

    if (!symbol || !accountSize || !tradeRiskPercent) {
      alert('Please fill in all fields');
      return;
    }

    if (accountSizeNum <= 0 || riskNum <= 0 || riskNum > 100) {
      alert('Please enter valid account size and risk percentage (0-100)');
      return;
    }

    // Symbol is already normalized from dropdown
    const normalizedSymbol = symbol.toUpperCase();
    onSubmit(normalizedSymbol, accountSizeNum, riskNum, symbol);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Your Signal</CardTitle>
        <CardDescription>
          Enter your trading parameters to receive a personalized signal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trading symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Trading Symbol</Label>
            <Select
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
            >
              {Object.entries(TRADING_SYMBOLS).map(([category, symbols]) => (
                <optgroup key={category} label={category}>
                  {symbols.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the trading pair you want to analyze.
            </p>

            {symbol.trim() && !marketStatus.isOpen && marketStatus.message && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                <p className="font-semibold mb-1">Market appears to be closed</p>
                <p>{marketStatus.message}</p>
              </div>
            )}
          </div>

          {/* Account size */}
          <div className="space-y-2">
            <Label htmlFor="accountSize">Account Size (USD)</Label>
            <Input
              id="accountSize"
              type="number"
              step="0.01"
              min="0"
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Total capital available for trading.
            </p>
          </div>

          {/* Risk percentage */}
          <div className="space-y-2">
            <Label htmlFor="riskPercent">Trade Risk (%)</Label>
            <Input
              id="riskPercent"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={tradeRiskPercent}
              onChange={(e) => setTradeRiskPercent(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Maximum percentage of account to risk per trade.
            </p>

            {isHighRisk && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                Warning: You are risking more than 3% on a single trade. This is
                considered aggressive and can lead to larger drawdowns.
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            <span className="mr-2">✨</span>
            {isLoading ? 'Generating Signal...' : 'Generate AI Signal'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
