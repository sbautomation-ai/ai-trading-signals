export const INSTRUMENTS: Record<string, { valuePerUnitUSD: number; lotDenominator: number }> = {
    "xau/usd": { valuePerUnitUSD: 1, lotDenominator: 100 },
    "xauusd": { valuePerUnitUSD: 1, lotDenominator: 100 },
    "btc/usd": { valuePerUnitUSD: 1, lotDenominator: 1 },
    "btcusd": { valuePerUnitUSD: 1, lotDenominator: 1 },
    "eur/usd": { valuePerUnitUSD: 1, lotDenominator: 100000 },
    "gbp/usd": { valuePerUnitUSD: 1, lotDenominator: 100000 },
  };
  
  export function normalizeSymbol(s: string) { return s.trim().toLowerCase(); }
  export function instrumentMeta(symbol: string) {
    const key = normalizeSymbol(symbol);
    return INSTRUMENTS[key] ?? { valuePerUnitUSD: 1, lotDenominator: 100000 };
  }
  
  export function calcUnits({ accountSize, riskPercent, entryPrice, stopLoss, symbol }:{ accountSize:number; riskPercent:number; entryPrice:number; stopLoss:number; symbol:string; }){
    const { valuePerUnitUSD } = instrumentMeta(symbol);
    const riskAmountUSD = accountSize * (riskPercent / 100);
    const stopDistance = Math.abs(entryPrice - stopLoss);
    const pnlPerUnitAtSL = stopDistance * valuePerUnitUSD;
    const units = pnlPerUnitAtSL > 0 ? riskAmountUSD / pnlPerUnitAtSL : 0;
    return { units, riskAmountUSD };
  }
  
  export function toLots(units:number, symbol:string){
    const { lotDenominator } = instrumentMeta(symbol);
    return units / lotDenominator;
  }
  
  export function calcDerived({ direction, entryPrice, stopLoss, tp1, tp2, units, symbol, riskAmountUSD }:{ direction:"buy"|"sell"; entryPrice:number; stopLoss:number; tp1:number; tp2:number; units:number; symbol:string; riskAmountUSD:number; }){
    const { valuePerUnitUSD } = instrumentMeta(symbol);
    const priceMove = (target:number)=>Math.abs(target - entryPrice);
    const profitUSD = (target:number)=> priceMove(target) * valuePerUnitUSD * units;
    const profitTP1USD = profitUSD(tp1);
    const profitTP2USD = profitUSD(tp2);
    const rrTP1 = riskAmountUSD > 0 ? profitTP1USD / riskAmountUSD : 0;
    const rrTP2 = riskAmountUSD > 0 ? profitTP2USD / riskAmountUSD : 0;
    return { profitTP1USD, profitTP2USD, rrTP1, rrTP2 };
  }