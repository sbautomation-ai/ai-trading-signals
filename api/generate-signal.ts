// api/generate-signal.ts
// Serverless function for generating trading signals (Vercel Node.js 20)
// - Robust CORS handling (preflight + responses)
// - Safe JSON body parsing (handles string/undefined)
// - Same business logic you had

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TradingSignal {
  symbol: string;
  direction: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  currentPrice: number;
}

interface PositionDetails {
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

interface SignalResponse {
  signal: TradingSignal;
  positionDetails: PositionDetails;
}

interface SignalRequest {
  symbol: string;
  accountSize: number;
  tradeRiskPercent: number;
}

interface InstrumentMetadata {
  lotSize: number;
  pipValue?: number;
}

const INSTRUMENT_METADATA: Record<string, InstrumentMetadata> = {
  // Indices
  SPX500: { lotSize: 1 },
  US100: { lotSize: 1 },
  US30: { lotSize: 1 },

  // Metals
  XAUUSD: { lotSize: 100 },
  XAGUSD: { lotSize: 5000 },
  XPDUSD: { lotSize: 100 },
  GOLD: { lotSize: 100 },

  // Crypto
  BTCUSD: { lotSize: 1 },
  BTCEUR: { lotSize: 1 },
  ETHUSD: { lotSize: 1 },
  LTCUSD: { lotSize: 1 },
  XRPUSD: { lotSize: 1 },
  BTCUSDT: { lotSize: 1 },
  ETHUSDT: { lotSize: 1 },

  // Forex Majors
  EURUSD: { lotSize: 100000, pipValue: 0.0001 },
  GBPUSD: { lotSize: 100000, pipValue: 0.0001 },
  USDJPY: { lotSize: 100000, pipValue: 0.01 },
  AUDUSD: { lotSize: 100000, pipValue: 0.0001 },
  USDCAD: { lotSize: 100000, pipValue: 0.0001 },
  USDCHF: { lotSize: 100000, pipValue: 0.0001 },
  NZDUSD: { lotSize: 100000, pipValue: 0.0001 },
  AUDCAD: { lotSize: 100000, pipValue: 0.0001 },
  AUDCHF: { lotSize: 100000, pipValue: 0.0001 },
  AUDJPY: { lotSize: 100000, pipValue: 0.01 },
  AUDNZD: { lotSize: 100000, pipValue: 0.0001 },
  CADCHF: { lotSize: 100000, pipValue: 0.0001 },
  CADJPY: { lotSize: 100000, pipValue: 0.01 },
  CHFJPY: { lotSize: 100000, pipValue: 0.01 },
  EURAUD: { lotSize: 100000, pipValue: 0.0001 },
  EURCAD: { lotSize: 100000, pipValue: 0.0001 },
  EURCHF: { lotSize: 100000, pipValue: 0.0001 },
  EURGBP: { lotSize: 100000, pipValue: 0.0001 },
  EURJPY: { lotSize: 100000, pipValue: 0.01 },
  EURNZD: { lotSize: 100000, pipValue: 0.0001 },
  GBPAUD: { lotSize: 100000, pipValue: 0.0001 },
  GBPCAD: { lotSize: 100000, pipValue: 0.0001 },
  GBPCHF: { lotSize: 100000, pipValue: 0.0001 },
  GBPJPY: { lotSize: 100000, pipValue: 0.01 },
  GBPNZD: { lotSize: 100000, pipValue: 0.0001 },
  NZDCAD: { lotSize: 100000, pipValue: 0.0001 },
  NZDCHF: { lotSize: 100000, pipValue: 0.0001 },
  NZDJPY: { lotSize: 100000, pipValue: 0.01 },
};

function getInstrumentMetadata(symbol: string): InstrumentMetadata {
  const upper = symbol.toUpperCase();
  return INSTRUMENT_METADATA[upper] || { lotSize: 1 };
}

function calculateLotSize(
  accountSize: number,
  riskPercent: number,
  entry: number,
  stopLoss: number,
  symbol: string
): { lots: number; units: number } {
  const amountRisking = (accountSize * riskPercent) / 100;
  const metadata = getInstrumentMetadata(symbol);
  const riskPerUnit = Math.abs(entry - stopLoss);

  if (!isFinite(riskPerUnit) || riskPerUnit <= 0) {
    return { lots: 0, units: 0 };
  }

  const units = amountRisking / riskPerUnit;
  const lots = units / metadata.lotSize;

  return {
    lots: Math.max(0, Math.round(lots * 100) / 100),
    units: Math.max(0, Math.round(units * 100) / 100),
  };
}

function calculatePositionDetails(
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

  const riskPerUnit = Math.abs(signal.entry - signal.stopLoss);
  const profitAtTP1 = units * Math.abs(signal.takeProfit1 - signal.entry);
  const profitAtTP2 = units * Math.abs(signal.takeProfit2 - signal.entry);

  const riskRewardTP1 =
    riskPerUnit > 0 ? Math.abs(signal.takeProfit1 - signal.entry) / riskPerUnit : 0;
  const riskRewardTP2 =
    riskPerUnit > 0 ? Math.abs(signal.takeProfit2 - signal.entry) / riskPerUnit : 0;

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

function generateMockSignal(symbol: string, currentPrice: number): TradingSignal {
  const isBuy = Math.random() > 0.5;
  const volatility = currentPrice * 0.02;

  const entry = currentPrice;
  const stopLoss = isBuy ? currentPrice - volatility * 0.5 : currentPrice + volatility * 0.5;
  const takeProfit1 = isBuy ? currentPrice + volatility : currentPrice - volatility;
  const takeProfit2 = isBuy ? currentPrice + volatility * 1.5 : currentPrice - volatility * 1.5;

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

interface AlphaVantageResponse {
  'Global Quote'?: {
    '05. price'?: string;
  };
}

async function fetchPrice(symbol: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data: AlphaVantageResponse = await r.json();
    const val = data?.['Global Quote']?.['05. price'];
    return val ? parseFloat(val) : null;
  } catch (err) {
    console.error('Alpha Vantage fetch error:', err);
    return null;
  }
}

/** ---- CORS helpers ---- */
function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // switch to strict allowlist if using cookies
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
}

/** Safe JSON parsing for body which might be a string or undefined */
function getJsonBody<T = any>(req: VercelRequest): T {
  const b = (req as any).body;
  if (b == null) return {} as T;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b) as T;
    } catch {
      return {} as T;
    }
  }
  return b as T;
}

/** ---- Main handler ---- */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = getJsonBody<SignalRequest>(req);
    const symbol = String(body?.symbol ?? '').trim();
    const accountSize = Number(body?.accountSize);
    const tradeRiskPercent = Number(body?.tradeRiskPercent);

    // Basic validation
    if (!symbol || !isFinite(accountSize) || !isFinite(tradeRiskPercent)) {
      return res
        .status(400)
        .json({ error: 'Missing or invalid fields: symbol, accountSize, tradeRiskPercent' });
    }
    if (accountSize <= 0 || tradeRiskPercent <= 0 || tradeRiskPercent > 100) {
      return res.status(400).json({ error: 'Invalid account size or risk percentage' });
    }

    // Price: try Alpha Vantage, fallback to simple mock table
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    let currentPrice: number | null = null;
    if (apiKey) {
      currentPrice = await fetchPrice(symbol, apiKey);
    }
    if (currentPrice == null) {
      const mockPrices: Record<string, number> = {
        XAUUSD: 2000,
        EURUSD: 1.1,
        GBPUSD: 1.25,
        USDJPY: 150,
        BTCUSD: 45000,
        ETHUSD: 2500,
      };
      currentPrice = mockPrices[symbol.toUpperCase()] ?? 100;
    }

    const response: SignalResponse = generateSignal(
      symbol,
      currentPrice,
      accountSize,
      tradeRiskPercent
    );

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(response);
  } catch (err) {
    console.error('Error generating signal:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** Compose signal from price + risk inputs */
function generateSignal(
  symbol: string,
  currentPrice: number,
  accountSize: number,
  riskPercent: number
): SignalResponse {
  const signal = generateMockSignal(symbol, currentPrice);
  const positionDetails = calculatePositionDetails(signal, accountSize, riskPercent);
  return { signal, positionDetails };
}
