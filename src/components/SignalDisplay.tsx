import { TradingSignal } from "@/types/trading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SignalDisplay({ signal, isLoading }: { signal: TradingSignal | null; isLoading?: boolean; }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 min-h-[420px]">
      <CardContent className="p-6">
        {!signal && !isLoading && (
          <div className="flex h-[360px] items-center justify-center text-zinc-500">No signal generated yet</div>
        )}
        {isLoading && (
          <div className="flex h-[360px] items-center justify-center text-zinc-400">Generating…</div>
        )}
        {signal && !isLoading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase text-zinc-400">{signal.symbol}</div>
                <div className="text-xs text-zinc-500">{new Date(signal.timestamp).toLocaleString()}</div>
              </div>
              <Badge variant="secondary" className={signal.direction === "buy" ? "bg-emerald-600/20 text-emerald-300 border-emerald-700/30" : "bg-red-600/20 text-red-300 border-red-700/30"}>
                {signal.direction.toUpperCase()}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Stat label="Entry Price" value={signal.entryPrice} money />
              <Stat label="Stop Loss" value={signal.stopLoss} money />
              <Stat label="Take Profit 1" value={signal.takeProfit1} money />
              <Stat label="Take Profit 2" value={signal.takeProfit2} money />
            </div>

            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="p-4 text-sm text-zinc-300">
                <b className="text-zinc-100">Risk Management:</b> When trade hits TP1, move SL to entry
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400 mb-1">Recommended Lot Size</div>
                <div className="text-3xl font-semibold text-zinc-100">{signal.lotSize.toFixed(2)}</div>
                <div className="text-xs text-zinc-500">{signal.units.toFixed(4)} units</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-zinc-200 mb-3">Position Details</div>
                <ul className="grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
                  <li>Account Size: ${signal.accountSize.toLocaleString()}</li>
                  <li>Risk per Trade: {signal.riskPercent}%</li>
                  <li>Amount Risking: ${signal.riskAmountUSD.toFixed(2)}</li>
                  <li>Profit at TP1: ${signal.profitTP1USD.toFixed(2)}</li>
                  <li>Profit at TP2: ${signal.profitTP2USD.toFixed(2)}</li>
                  <li>Risk:Reward (TP1): {signal.rrTP1.toFixed(2)}:1</li>
                  <li>Risk:Reward (TP2): {signal.rrTP2.toFixed(2)}:1</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, money }: { label: string; value: number; money?: boolean }) {
  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardContent className="p-4">
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="text-xl font-semibold text-zinc-100">{money ? `$${value.toFixed(2)}` : value.toFixed(2)}</div>
      </CardContent>
    </Card>
  );
}
