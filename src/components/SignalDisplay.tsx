import React from 'react';
import type { SignalResponse } from '../types/trading';

interface SignalDisplayProps {
  // We keep this flexible: when there's no signal yet, it's null.
  signalData: SignalResponse | null;
}

export const SignalDisplay: React.FC<SignalDisplayProps> = ({
  signalData,
}) => {
  if (!signalData) {
    return (
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-lg font-semibold mb-2">Signal preview</h2>
        <p className="text-sm text-muted-foreground">
          Fill in the form and generate a signal to see the details here.
        </p>
      </div>
    );
  }

  // We assume SignalResponse has `signal` and `risk` objects.
  const { signal, risk } = signalData as any;

  return (
    <div className="border rounded-lg p-6 bg-card space-y-4">
      <h2 className="text-lg font-semibold">Generated Signal</h2>

      <div className="space-y-1 text-sm">
        {signal?.symbol && (
          <p>
            <span className="font-medium">Symbol:</span> {signal.symbol}
          </p>
        )}
        {signal?.side && (
          <p>
            <span className="font-medium">Side:</span>{' '}
            {String(signal.side).toUpperCase()}
          </p>
        )}
        {signal?.entryType && (
          <p>
            <span className="font-medium">Entry type:</span> {signal.entryType}
          </p>
        )}
        {signal?.entryPrice !== undefined && (
          <p>
            <span className="font-medium">Entry price:</span>{' '}
            {signal.entryPrice}
          </p>
        )}
        {signal?.stopLoss !== undefined && (
          <p>
            <span className="font-medium">Stop loss:</span> {signal.stopLoss}
          </p>
        )}
        {signal?.takeProfit1 !== undefined && (
          <p>
            <span className="font-medium">Take profit 1:</span>{' '}
            {signal.takeProfit1}
          </p>
        )}
        {signal?.takeProfit2 !== undefined && (
          <p>
            <span className="font-medium">Take profit 2:</span>{' '}
            {signal.takeProfit2}
          </p>
        )}
        {signal?.timeFrame && (
          <p>
            <span className="font-medium">Timeframe:</span> {signal.timeFrame}
          </p>
        )}
      </div>

      <div className="border-t pt-4 space-y-1 text-sm">
        <h3 className="font-semibold">Risk / Position Sizing</h3>
        {risk?.accountSize !== undefined && (
          <p>
            <span className="font-medium">Account size:</span>{' '}
            {risk.accountSize}
          </p>
        )}
        {risk?.tradeRiskPercent !== undefined && (
          <p>
            <span className="font-medium">Risk per trade:</span>{' '}
            {risk.tradeRiskPercent}%{/* you can format further if you like */}
          </p>
        )}
        {risk?.riskAmount !== undefined && (
          <p>
            <span className="font-medium">Risk amount:</span> {risk.riskAmount}
          </p>
        )}
        {risk?.positionSize !== undefined && (
          <p>
            <span className="font-medium">Position size:</span>{' '}
            {risk.positionSize}
          </p>
        )}
      </div>

      {signal?.comment && (
        <div className="border-t pt-4 text-sm text-muted-foreground">
          <p className="font-semibold mb-1">Comment / Notes</p>
          <p>{signal.comment}</p>
        </div>
      )}
    </div>
  );
};
