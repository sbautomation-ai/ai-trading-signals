import { useState, FormEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

interface SignalFormProps {
  onSubmit: (symbol: string, accountSize: number, tradeRiskPercent: number, originalSymbol: string) => void;
  isLoading: boolean;
}

export function SignalForm({ onSubmit, isLoading }: SignalFormProps) {
  const [symbol, setSymbol] = useState('xau/usd');
  const [accountSize, setAccountSize] = useState('10000');
  const [tradeRiskPercent, setTradeRiskPercent] = useState('2');

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

    // Normalize symbol: remove slashes and convert to uppercase
    const normalizedSymbol = symbol.replace(/\//g, '').toUpperCase();
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
          <div className="space-y-2">
            <Label htmlFor="symbol">Trading Symbol</Label>
            <Input
              id="symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the trading pair you want to analyze.
            </p>
          </div>

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

