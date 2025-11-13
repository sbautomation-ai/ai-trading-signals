export interface TradingSignal {
  symbol: string;
  direction: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  currentPrice: number;
}

export interface PositionDetails {
  accountSize: number;
  riskPerTrade: number;
  amountRisking: number;
  profitAtTP1: number;
  profitAtTP2: number;
  riskRewardTP1: number;
  riskRewardTP2: number;
  recommendedLots: number;
  recommendedUnits: number;
}

export interface SignalResponse {
  signal: TradingSignal;
  positionDetails: PositionDetails;
}

export interface SignalRequest {
  symbol: string;
  accountSize: number;
  tradeRiskPercent: number;
}

