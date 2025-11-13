import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FormValues { symbol: string; accountSize: number; riskPercent: number; }
export default function SignalForm({ onSubmit, isLoading }: { onSubmit: (v: FormValues)=>void; isLoading?: boolean; }) {
  const [symbol, setSymbol] = useState("xau/usd");
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(2);
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <Label>Trading Symbol</Label>
          <Input value={symbol} onChange={(e)=>setSymbol(e.target.value)} placeholder="xau/usd" />
          <p className="text-xs text-zinc-500">Enter the trading pair you want to analyze</p>
        </div>
        <div className="space-y-2">
          <Label>Account Size (USD)</Label>
          <Input type="number" value={accountSize} onChange={(e)=>setAccountSize(Number(e.target.value))} min={0} />
        </div>
        <div className="space-y-2">
          <Label>Trade Risk (%)</Label>
          <Input type="number" value={riskPercent} onChange={(e)=>setRiskPercent(Number(e.target.value))} min={0} max={100} />
          <p className="text-xs text-zinc-500">Maximum percentage of account to risk per trade</p>
        </div>
        <Button className="w-full" onClick={()=>onSubmit({ symbol, accountSize, riskPercent })} disabled={isLoading}>
          {isLoading ? "Generating…" : "Generate AI Signal"}
        </Button>
      </CardContent>
    </Card>
  );
}
