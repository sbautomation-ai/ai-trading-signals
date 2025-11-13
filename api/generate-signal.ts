// Serverless function for generating trading signals
// Compatible with Vercel, AWS Lambda, Cloudflare Workers, or any serverless platform

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
  'SPX500': { lotSize: 1 },
  'US100': { lotSize: 1 },
  'US30': { lotSize: 1 },
  
  // Metals
  'XAUUSD': { lotSize: 100 },
  'XAGUSD': { lotSize: 5000 },
  'XPDUSD': { lotSize: 100 },
  'GOLD': { lotSize: 100 },
  
  // Crypto
  'BTCUSD': { lotSize: 1 },
  'BTCEUR': { lotSize: 1 },
  'ETHUSD': { lotSize: 1 },
  'LTCUSD': { lotSize: 1 },
  'XRPUSD': { lotSize: 1 },
  'BTCUSDT': { lotSize: 1 },
  'ETHUSDT': { lotSize: 1 },
  
  // Forex Majors
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

function getInstrumentMetadata(symbol: string): InstrumentMetadata {
  const upperSymbol = symbol.toUpperCase();
  return INSTRUMENT_METADATA[upperSymbol] || { lotSize: 1 };
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
  
  if (riskPerUnit === 0) {
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

function generateMockSignal(
  symbol: string,
  currentPrice: number
): TradingSignal {
  const isBuy = Math.random() > 0.5;
  const volatility = currentPrice * 0.02;
  
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

interface AlphaVantageResponse {
  'Global Quote': {
    '05. price': string;
  };
}

/**
 * Fetch current price from Alpha Vantage API
 */
async function fetchPrice(symbol: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data: AlphaVantageResponse = await response.json();
    
    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      return parseFloat(data['Global Quote']['05. price']);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching price from Alpha Vantage:', error);
    return null;
  }
}

/**
 * Generate a trading signal with consistent calculations
 */
function generateSignal(
  symbol: string,
  currentPrice: number,
  accountSize: number,
  riskPercent: number
): SignalResponse {
  // Generate signal based on current price
  const signal = generateMockSignal(symbol, currentPrice);
  
  // Calculate position details
  const positionDetails = calculatePositionDetails(signal, accountSize, riskPercent);
  
  return {
    signal,
    positionDetails,
  };
}

// Vercel-compatible handler
export default async function handler(req: any, res: any) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body: SignalRequest = req.body;
    const { symbol, accountSize, tradeRiskPercent } = body;

    // Validate input
    if (!symbol || !accountSize || !tradeRiskPercent) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Missing required fields: symbol, accountSize, tradeRiskPercent' });
    }

    if (accountSize <= 0 || tradeRiskPercent <= 0 || tradeRiskPercent > 100) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Invalid account size or risk percentage' });
    }

    // Try to fetch real price, fallback to mock
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    let currentPrice: number;

    if (apiKey) {
      const fetchedPrice = await fetchPrice(symbol, apiKey);
      currentPrice = fetchedPrice || 100; // Fallback to 100 if fetch fails
    } else {
      // Mock price based on symbol
      const mockPrices: Record<string, number> = {
        'XAUUSD': 2000,
        'EURUSD': 1.10,
        'GBPUSD': 1.25,
        'USDJPY': 150,
        'BTCUSD': 45000,
        'ETHUSD': 2500,
      };
      currentPrice = mockPrices[symbol.toUpperCase()] || 100;
    }

    // Generate signal with consistent calculations
    const response = generateSignal(symbol, currentPrice, accountSize, tradeRiskPercent);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating signal:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
