export type OrderType = "market" | "limit";
export type Direction = "buy" | "sell";

export interface TradingSignal {
  symbol: string;
  direction: Direction;
  orderType: OrderType;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  timestamp: string;
  accountSize: number;
  riskPercent: number;
  lotSize: number;   // standard lots where applicable
  units: number;     // raw position size
  notes?: string[];

  riskAmountUSD: number;
  profitTP1USD: number;
  profitTP2USD: number;
  rrTP1: number;
  rrTP2: number;
}