import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface SignalDisplayProps {
  // Matches how App.tsx calls this component
  signalData: any | null;
  onSaveToNotes?: (content: string) => void;
}

// Format a broker-friendly text version of the signal for copy/download/notes
function formatSignalText(data: any): string {
  if (!data || !data.signal || !data.risk) return '';

  const { signal, risk } = data;
  const {
    symbol,
    side,
    entryType,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    timeFrame,
    comment,
  } = signal;
  const { accountSize, tradeRiskPercent, riskAmount, positionSize } = risk;

  const sideLabel =
    typeof side === 'string' ? side.toUpperCase() : String(side);
  const entryTypeLabel =
    entryType === 'limit' ? 'LIMIT ORDER' : 'MARKET ORDER';

  return [
    'AI TRADE SIGNAL',
    '----------------',
    `Symbol       : ${symbol ?? '-'}`,
    `Side         : ${sideLabel}`,
    `Order Type   : ${entryTypeLabel}`,
    `Timeframe    : ${timeFrame ?? '-'}`,
    '',
    `Entry        : ${entryPrice ?? '-'}`,
    `Stop Loss    : ${stopLoss ?? '-'}`,
    `Take Profit 1: ${takeProfit1 ?? '-'}`,
    `Take Profit 2: ${takeProfit2 ?? '-'}`,
    '',
    'RISK',
    '----',
    `Account Size      : ${accountSize ?? '-'}`,
    `Risk per Trade %  : ${tradeRiskPercent ?? '-'}`,
    `Risk Amount       : ${riskAmount ?? '-'}`,
    `Position Size     : ${positionSize ?? '-'}`,
    '',
    'NOTES',
    '-----',
    comment ?? 'AI-generated idea. Always do your own research.',
  ].join('\n');
}

// Simple helper for safely formatting numbers
function formatNumber(value: unknown, decimals: number = 2): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toFixed(decimals);
}

export function SignalDisplay({ signalData, onSaveToNotes }: SignalDisplayProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>(
    'idle'
  );

  const hasSignal = signalData && signalData.signal && signalData.risk;

  const handleCopy = async () => {
    if (!hasSignal) return;
    try {
      const text = formatSignalText(signalData);
      if (!text) return;
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy signal:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  const handleDownloadText = () => {
    if (!hasSignal) return;
    const text = formatSignalText(signalData);
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const symbol =
      signalData.signal?.symbol &&
      String(signalData.signal.symbol).trim().length > 0
        ? String(signalData.signal.symbol).toUpperCase()
        : 'signal';

    a.href = url;
    a.download = `${symbol}-signal.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSaveToNotes = () => {
    if (!hasSignal || !onSaveToNotes) return;
    const text = formatSignalText(signalData);
    if (!text) return;
    onSaveToNotes(text);
  };

  if (!hasSignal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Signal Details</CardTitle>
          <CardDescription>
            Once you generate a signal, you&apos;ll see the full breakdown here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the form on the left to request an AI-powered trading signal.
            We&apos;ll show the trade setup, risk details, and targets as soon
            as one is generated.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { signal, risk } = signalData;
  const side: string = (signal?.side ?? 'buy').toString().toUpperCase();
  const isBuy = side === 'BUY';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Signal Details</CardTitle>
          <CardDescription>
            Review the trade setup, risk, and targets before you execute.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={
              isBuy
                ? 'border border-emerald-500/60 text-emerald-400 bg-emerald-500/10'
                : 'border border-red-500/60 text-red-400 bg-red-500/10'
            }
          >
            {side === 'BUY' ? 'BUY' : 'SELL'}
          </Badge>
          {signal?.symbol && (
            <Badge variant="secondary" className="uppercase">
              {signal.symbol}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trade Setup */}
        <section className="space-y-1">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
            Trade Setup
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase text-muted-foreground">
                Entry type
              </p>
              <p className="font-medium">
                {signal?.entryType === 'limit' ? 'Limit order' : 'Market order'}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase text-muted-foreground">
                Timeframe
              </p>
              <p className="font-medium">{signal?.timeFrame ?? 'H1'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase text-muted-foreground">
                Entry price
              </p>
              <p className="font-medium">
                {formatNumber(signal?.entryPrice, 5)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase text-muted-foreground">
                Position size
              </p>
              <p className="font-medium">
                {formatNumber(risk?.positionSize, 2)}
              </p>
            </div>
          </div>
        </section>

        {/* Risk */}
        <section className="space-y-1">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
            Risk
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase text-muted-foreground">
                Account size
              </p>
              <p className="font-medium">
                {formatNumber(risk?.accountSize, 2)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase text-muted-foreground">
                Risk per trade
              </p>
              <p className="font-medium">
                {formatNumber(risk?.tradeRiskPercent, 2)}%
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase text-muted-foreground">
                Risk amount
              </p>
              <p className="font-medium">
                {formatNumber(risk?.riskAmount, 2)}
              </p>
            </div>
          </div>
        </section>

        {/* Targets */}
        <section className="space-y-1">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
            Targets
          </h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase text-muted-foreground">
                Stop loss
              </p>
              <p className="font-medium text-red-400">
                {formatNumber(signal?.stopLoss, 5)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase text-muted-foreground">
                Take profit 1
              </p>
              <p className="font-medium text-emerald-400">
                {formatNumber(signal?.takeProfit1, 5)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase text-muted-foreground">
                Take profit 2
              </p>
              <p className="font-medium text-emerald-400">
                {formatNumber(signal?.takeProfit2, 5)}
              </p>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-1">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
            Notes
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {signal?.comment ??
              'AI-generated trading idea. Always validate levels and manage your own risk.'}
          </p>
        </section>

        {/* Actions */}
        <section className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            {copyStatus === 'copied'
              ? 'Copied!'
              : copyStatus === 'error'
              ? 'Copy failed'
              : 'Copy signal'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadText}
          >
            Download .txt
          </Button>
          {onSaveToNotes && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveToNotes}
            >
              Save to Notes
            </Button>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
