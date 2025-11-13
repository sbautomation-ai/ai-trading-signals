import { TradingSignal, PositionDetails } from '../types/trading';

export interface InstrumentMetadata {
  lotSize: number; // Units per lot
  pipValue?: number; // For FX pairs
}

// Instrument metadata mapping
const INSTRUMENT_METADATA: Record<string, InstrumentMetadata> = {
  // Indices (typically 1 lot = 1 unit, but varies by broker)
  'SPX500': { lotSize: 1 },
  'US100': { lotSize: 1 },
  'US30': { lotSize: 1 },
  
  // Metals
  'XAUUSD': { lotSize: 100 }, // 1 lot = 100 oz
  'XAGUSD': { lotSize: 5000 }, // 1 lot = 5000 oz (silver)
  'XPDUSD': { lotSize: 100 }, // 1 lot = 100 oz (palladium)
  'GOLD': { lotSize: 100 },
  
  // Crypto (1 lot = 1 unit)
  'BTCUSD': { lotSize: 1 },
  'BTCEUR': { lotSize: 1 },
  'ETHUSD': { lotSize: 1 },
  'LTCUSD': { lotSize: 1 },
  'XRPUSD': { lotSize: 1 },
  'BTCUSDT': { lotSize: 1 },
  'ETHUSDT': { lotSize: 1 },
  
  // Forex Majors (1 lot = 100,000 units)
  'EURUSD': { lotSize: 100000, pipValue: 0.0001 },
  'GBPUSD': { lotSize: 100000, pipValue: 0.0001 },
  'USDJPY': { lotSize: 100000, pipValue: 0.01 },
  'AUDUSD': { lotSize: 100000, pipValue: 0.0001 },
  'USDCAD': { lotSize: 100000, pipValue: 0.0001 },
  'USDCHF': { lotSize: 100000, pipValue: 0.0001 },
  'NZDUSD': { lotSize: 100000, pipValue: 0.0001 },
  'AUDCAD': { lotSize: 100000, pipValue: 0.0001 },
  'AUDCHF': { lotSize: 100000, pipValue: 0.0001 },
  'AUDJPY': { lotSize: 100000, pipValue: 0.01 },
  'AUDNZD': { lotSize: 100000, pipValue: 0.0001 },
  'CADCHF': { lotSize: 100000, pipValue: 0.0001 },
  'CADJPY': { lotSize: 100000, pipValue: 0.01 },
  'CHFJPY': { lotSize: 100000, pipValue: 0.01 },
  'EURAUD': { lotSize: 100000, pipValue: 0.0001 },
  'EURCAD': { lotSize: 100000, pipValue: 0.0001 },
  'EURCHF': { lotSize: 100000, pipValue: 0.0001 },
  'EURGBP': { lotSize: 100000, pipValue: 0.0001 },
  'EURJPY': { lotSize: 100000, pipValue: 0.01 },
  'EURNZD': { lotSize: 100000, pipValue: 0.0001 },
  'GBPAUD': { lotSize: 100000, pipValue: 0.0001 },
  'GBPCAD': { lotSize: 100000, pipValue: 0.0001 },
  'GBPCHF': { lotSize: 100000, pipValue: 0.0001 },
  'GBPJPY': { lotSize: 100000, pipValue: 0.01 },
  'GBPNZD': { lotSize: 100000, pipValue: 0.0001 },
  'NZDCAD': { lotSize: 100000, pipValue: 0.0001 },
  'NZDCHF': { lotSize: 100000, pipValue: 0.0001 },
  'NZDJPY': { lotSize: 100000, pipValue: 0.01 },
};

/**
 * Get instrument metadata for a symbol
 */
export function getInstrumentMetadata(symbol: string): InstrumentMetadata {
  const upperSymbol = symbol.toUpperCase();
  return INSTRUMENT_METADATA[upperSymbol] || { lotSize: 1 }; // Default to 1 for unknown instruments
}

/**
 * Calculate recommended lot size based on risk
 */
export function calculateLotSize(
  accountSize: number,
  riskPercent: number,
  entry: number,
  stopLoss: number,
  symbol: string
): { lots: number; units: number } {
  const amountRisking = (accountSize * riskPercent) / 100;
  const metadata = getInstrumentMetadata(symbol);
  const riskPerUnit = Math.abs(entry - stopLoss);
  
  if (riskPerUnit === 0) {
    return { lots: 0, units: 0 };
  }
  
  // Calculate units based on risk
  const units = amountRisking / riskPerUnit;
  
  // Convert to lots
  const lots = units / metadata.lotSize;
  
  return {
    lots: Math.max(0, Math.round(lots * 100) / 100), // Round to 2 decimal places
    units: Math.max(0, Math.round(units * 100) / 100),
  };
}

/**
 * Calculate position details from signal
 */
export function calculatePositionDetails(
  signal: TradingSignal,
  accountSize: number,
  riskPercent: number
): PositionDetails {
  const amountRisking = (accountSize * riskPercent) / 100;
  const { lots, units } = calculateLotSize(
    accountSize,
    riskPercent,
    signal.entry,
    signal.stopLoss,
    signal.symbol
  );
  
  // Calculate profit at TP1 and TP2
  const riskPerUnit = Math.abs(signal.entry - signal.stopLoss);
  const profitAtTP1 = units * Math.abs(signal.takeProfit1 - signal.entry);
  const profitAtTP2 = units * Math.abs(signal.takeProfit2 - signal.entry);
  
  // Calculate risk:reward ratios
  const riskRewardTP1 = riskPerUnit > 0 ? Math.abs(signal.takeProfit1 - signal.entry) / riskPerUnit : 0;
  const riskRewardTP2 = riskPerUnit > 0 ? Math.abs(signal.takeProfit2 - signal.entry) / riskPerUnit : 0;
  
  return {
    accountSize,
    riskPerTrade: riskPercent,
    amountRisking,
    profitAtTP1,
    profitAtTP2,
    riskRewardTP1,
    riskRewardTP2,
    recommendedLots: lots,
    recommendedUnits: units,
  };
}

/**
 * Generate a mock signal for testing
 */
export function generateMockSignal(
  symbol: string,
  currentPrice: number
): TradingSignal {
  const isBuy = Math.random() > 0.5;
  const volatility = currentPrice * 0.02; // 2% volatility
  
  const entry = currentPrice;
  const stopLoss = isBuy 
    ? currentPrice - volatility * 0.5
    : currentPrice + volatility * 0.5;
  const takeProfit1 = isBuy
    ? currentPrice + volatility
    : currentPrice - volatility;
  const takeProfit2 = isBuy
    ? currentPrice + volatility * 1.5
    : currentPrice - volatility * 1.5;
  
  return {
    symbol: symbol.toUpperCase(),
    direction: isBuy ? 'BUY' : 'SELL',
    orderType: 'MARKET',
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    currentPrice,
  };
}

