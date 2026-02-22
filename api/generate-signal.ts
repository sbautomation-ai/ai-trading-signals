// Vercel Node Function: /api/generate-signal
//
// Real signal generation pipeline:
//  1. Fetch live price + RSI(14) + ATR(14) on M15 from Twelve Data
//  2. Determine direction algorithmically from RSI
//  3. Size stop loss and take profits from ATR (1.5× SL, 1.5× TP1, 3× TP2)
//  4. Calculate position size from account risk
//  5. Optionally call GPT to write the comment (falls back to a template)
//
// Required env vars:
//   TWELVE_DATA_KEY  — Twelve Data API key
//   OPENAI_API_KEY   — optional; enables GPT comment
//   OPENAI_MODEL     — optional; defaults to gpt-4.1-mini

interface GenerateBody {
  symbol?: string;
  accountSize?: number;
  tradeRiskPercent?: number;
}

// Map our app symbols to Twelve Data's slash-separated format
const TD_SYMBOL_MAP: Record<string, string> = {
  // Metals
  XAUUSD: 'XAU/USD',
  XAGUSD: 'XAG/USD',
  XPDUSD: 'XPD/USD',
  GOLD: 'XAU/USD',
  // Crypto
  BTCUSD: 'BTC/USD',
  BTCEUR: 'BTC/EUR',
  ETHUSD: 'ETH/USD',
  LTCUSD: 'LTC/USD',
  XRPUSD: 'XRP/USD',
  BTCUSDT: 'BTC/USDT',
  ETHUSDT: 'ETH/USDT',
  // Indices (Twelve Data uses plain ticker; paid plan may be needed)
  SPX500: 'SPX',
  US100: 'NDX',
  US30: 'DJI',
  // Forex majors
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  AUDUSD: 'AUD/USD',
  USDCAD: 'USD/CAD',
  USDCHF: 'USD/CHF',
  NZDUSD: 'NZD/USD',
  AUDCAD: 'AUD/CAD',
  AUDCHF: 'AUD/CHF',
  AUDJPY: 'AUD/JPY',
  AUDNZD: 'AUD/NZD',
  CADCHF: 'CAD/CHF',
  CADJPY: 'CAD/JPY',
  CHFJPY: 'CHF/JPY',
  EURAUD: 'EUR/AUD',
  EURCAD: 'EUR/CAD',
  EURCHF: 'EUR/CHF',
  EURGBP: 'EUR/GBP',
  EURJPY: 'EUR/JPY',
  EURNZD: 'EUR/NZD',
  GBPAUD: 'GBP/AUD',
  GBPCAD: 'GBP/CAD',
  GBPCHF: 'GBP/CHF',
  GBPJPY: 'GBP/JPY',
  GBPNZD: 'GBP/NZD',
  NZDCAD: 'NZD/CAD',
  NZDCHF: 'NZD/CHF',
  NZDJPY: 'NZD/JPY',
};

// Lot-size metadata (mirrors src/lib/calc.ts)
const LOT_SIZE: Record<string, number> = {
  SPX500: 1, US100: 1, US30: 1,
  XAUUSD: 100, XAGUSD: 5000, XPDUSD: 100, GOLD: 100,
  BTCUSD: 1, BTCEUR: 1, ETHUSD: 1, LTCUSD: 1,
  XRPUSD: 1, BTCUSDT: 1, ETHUSDT: 1,
  EURUSD: 100000, GBPUSD: 100000, USDJPY: 100000,
  AUDUSD: 100000, USDCAD: 100000, USDCHF: 100000, NZDUSD: 100000,
  AUDCAD: 100000, AUDCHF: 100000, AUDJPY: 100000, AUDNZD: 100000,
  CADCHF: 100000, CADJPY: 100000, CHFJPY: 100000,
  EURAUD: 100000, EURCAD: 100000, EURCHF: 100000, EURGBP: 100000,
  EURJPY: 100000, EURNZD: 100000,
  GBPAUD: 100000, GBPCAD: 100000, GBPCHF: 100000, GBPJPY: 100000,
  GBPNZD: 100000,
  NZDCAD: 100000, NZDCHF: 100000, NZDJPY: 100000,
};

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function getPriceDecimals(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.endsWith('JPY') || s === 'XAGUSD' || ['US30', 'US100', 'SPX500'].includes(s)) return 2;
  if (['XAUUSD', 'GOLD', 'XPDUSD'].includes(s)) return 2;
  if (s.includes('BTC') || s.includes('ETH') || s.includes('LTC')) return 2;
  return 5; // FX default
}

// ---------------------------------------------------------------------------
// Twelve Data fetch
// ---------------------------------------------------------------------------

interface MarketData {
  price: number;
  rsi: number;
  atr: number;
}

async function fetchMarketData(symbol: string, apiKey: string): Promise<MarketData | null> {
  const tdSymbol = TD_SYMBOL_MAP[symbol.toUpperCase()] ?? symbol;
  const base = 'https://api.twelvedata.com';
  const enc = encodeURIComponent(tdSymbol);

  try {
    const [priceRes, rsiRes, atrRes] = await Promise.all([
      fetch(`${base}/price?symbol=${enc}&apikey=${apiKey}`),
      fetch(`${base}/rsi?symbol=${enc}&interval=15min&time_period=14&outputsize=1&apikey=${apiKey}`),
      fetch(`${base}/atr?symbol=${enc}&interval=15min&time_period=14&outputsize=1&apikey=${apiKey}`),
    ]);

    const [priceJson, rsiJson, atrJson] = await Promise.all([
      priceRes.json() as Promise<any>,
      rsiRes.json() as Promise<any>,
      atrRes.json() as Promise<any>,
    ]);

    if (priceJson.status === 'error' || rsiJson.status === 'error' || atrJson.status === 'error') {
      console.error('[generate-signal] Twelve Data error', { priceJson, rsiJson, atrJson });
      return null;
    }

    const price = parseFloat(priceJson.price);
    const rsi = parseFloat(rsiJson?.values?.[0]?.rsi);
    const atr = parseFloat(atrJson?.values?.[0]?.atr);

    if (!Number.isFinite(price) || !Number.isFinite(rsi) || !Number.isFinite(atr)) {
      console.error('[generate-signal] Non-finite market data', { price, rsi, atr });
      return null;
    }

    return { price, rsi, atr };
  } catch (err) {
    console.error('[generate-signal] Twelve Data fetch threw', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Algorithmic signal construction
// ---------------------------------------------------------------------------

interface SignalLevels {
  side: 'buy' | 'sell';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
}

function buildSignalLevels(symbol: string, price: number, rsi: number, atr: number): SignalLevels {
  // RSI < 50 → price has been declining recently → contrarian BUY (look for bounce)
  // RSI ≥ 50 → price has been rising recently → contrarian SELL (look for pullback)
  const side: 'buy' | 'sell' = rsi < 50 ? 'buy' : 'sell';
  const dec = getPriceDecimals(symbol);
  const entry = round(price, dec);

  const SL_MULT = 1.5;
  const TP1_MULT = 1.5; // 1:1 R:R
  const TP2_MULT = 3.0; // 2:1 R:R

  if (side === 'buy') {
    return {
      side,
      entryPrice: entry,
      stopLoss: round(price - SL_MULT * atr, dec),
      takeProfit1: round(price + TP1_MULT * atr, dec),
      takeProfit2: round(price + TP2_MULT * atr, dec),
    };
  }

  return {
    side,
    entryPrice: entry,
    stopLoss: round(price + SL_MULT * atr, dec),
    takeProfit1: round(price - TP1_MULT * atr, dec),
    takeProfit2: round(price - TP2_MULT * atr, dec),
  };
}

// ---------------------------------------------------------------------------
// Comment generation
// ---------------------------------------------------------------------------

function templateComment(
  symbol: string,
  side: string,
  rsi: number,
  atr: number,
  tradeRiskPercent: number
): string {
  const rsiLabel = rsi < 35 ? 'oversold' : rsi > 65 ? 'overbought' : 'neutral';
  const direction = side === 'buy' ? 'bullish' : 'bearish';
  const riskNote = tradeRiskPercent >= 3 ? ' Note: risk ≥ 3% is aggressive — ensure you are comfortable with this exposure.' : '';

  return (
    `RSI(14) on M15 reads ${rsi.toFixed(1)} (${rsiLabel}), supporting a ${direction} lean for ${symbol}. ` +
    `ATR(14) = ${atr.toFixed(4)}, used to size the stop 1.5× from entry; TP1 sits at a 1:1 R:R and TP2 at 2:1. ` +
    `When price hits TP1, move your stop loss to entry to lock in a risk-free position.${riskNote} ` +
    `This is not financial advice — always validate levels with your own analysis before trading.`
  );
}

async function gptComment(
  apiKey: string,
  model: string,
  symbol: string,
  side: string,
  entryPrice: number,
  stopLoss: number,
  takeProfit1: number,
  takeProfit2: number,
  rsi: number,
  atr: number,
  tradeRiskPercent: number
): Promise<string | null> {
  const prompt =
    `You are a concise trading analyst. Write a 3-4 sentence plain-English rationale for this M15 trade idea.\n\n` +
    `Symbol: ${symbol}\nDirection: ${side.toUpperCase()}\nEntry: ${entryPrice}\n` +
    `Stop Loss: ${stopLoss}\nTP1: ${takeProfit1}\nTP2: ${takeProfit2}\n` +
    `RSI(14) M15: ${rsi.toFixed(1)}\nATR(14) M15: ${atr.toFixed(4)}\nRisk per trade: ${tradeRiskPercent}%\n\n` +
    `Rules:\n` +
    `- Only reference RSI and ATR — do not invent other indicators or news.\n` +
    `- Mention whether RSI is oversold, overbought, or neutral.\n` +
    `- Include the TP1 → move-stop-to-entry management rule.\n` +
    `- End with: "This is not financial advice."\n` +
    `- Return plain text only — no markdown, no JSON.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 220,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return (data?.choices?.[0]?.message?.content as string | undefined)?.trim() ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

function sendJson(res: any, status: number, data: unknown) {
  res.status(status).json(data);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const rawBody = req.body;
    const body: GenerateBody =
      typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody || {};

    const symbol = (body.symbol || '').toString().toUpperCase();
    const accountSize = Number(body.accountSize);
    const tradeRiskPercentRaw = Number(body.tradeRiskPercent);

    if (!symbol || !Number.isFinite(accountSize) || !Number.isFinite(tradeRiskPercentRaw)) {
      sendJson(res, 400, { error: 'Missing or invalid symbol, accountSize, or tradeRiskPercent.' });
      return;
    }

    // Clamp risk to a safe range
    const tradeRiskPercent = Math.max(0.1, Math.min(tradeRiskPercentRaw, 5));
    const riskWasClamped = tradeRiskPercent !== tradeRiskPercentRaw;

    const twelveDataKey = process.env.TWELVE_DATA_KEY;
    if (!twelveDataKey) {
      sendJson(res, 500, { error: 'TWELVE_DATA_KEY is not configured on the server.' });
      return;
    }

    // 1. Real market data
    const market = await fetchMarketData(symbol, twelveDataKey);
    if (!market) {
      sendJson(res, 502, {
        error: `Could not fetch market data for ${symbol}. The symbol may not be supported on your Twelve Data plan, or a network error occurred.`,
      });
      return;
    }

    const { price, rsi, atr } = market;
    const rsiRounded = round(rsi, 2);
    const atrRounded = round(atr, 4);

    // 2. Algorithmic signal
    const { side, entryPrice, stopLoss, takeProfit1, takeProfit2 } =
      buildSignalLevels(symbol, price, rsi, atr);

    // 3. Comment — try GPT, fall back to template
    const openaiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    let comment: string;

    if (openaiKey) {
      const gpt = await gptComment(
        openaiKey, model, symbol, side,
        entryPrice, stopLoss, takeProfit1, takeProfit2,
        rsiRounded, atrRounded, tradeRiskPercent
      );
      comment = gpt ?? templateComment(symbol, side, rsiRounded, atrRounded, tradeRiskPercent);
    } else {
      comment = templateComment(symbol, side, rsiRounded, atrRounded, tradeRiskPercent);
    }

    // 4. Position sizing
    const riskAmount = round(accountSize * (tradeRiskPercent / 100), 2);
    const slDistance = Math.abs(entryPrice - stopLoss);
    const positionSizeUnits = slDistance > 0 ? riskAmount / slDistance : 0;
    const lotSize = LOT_SIZE[symbol] ?? 1;
    const positionSize = round(positionSizeUnits / lotSize, 2);

    sendJson(res, 200, {
      signal: {
        symbol,
        side,
        entryType: 'market',
        entryPrice,
        stopLoss,
        takeProfit1,
        takeProfit2,
        timeFrame: 'M15',
        currentPrice: entryPrice,
        comment,
        rsiAtSignal: rsiRounded,
        atrAtSignal: atrRounded,
      },
      risk: {
        accountSize,
        tradeRiskPercent,
        riskAmount,
        positionSize,
        positionSizeUnits: round(positionSizeUnits, 4),
      },
      ...(riskWasClamped && {
        warning: `Your requested risk of ${tradeRiskPercentRaw}% was outside the allowed range (0.1%–5%) and has been adjusted to ${tradeRiskPercent}%.`,
      }),
    });
  } catch (error: any) {
    console.error('[generate-signal] Unexpected error', { message: error?.message ?? String(error) });
    sendJson(res, 500, { error: 'Internal error while generating signal.' });
  }
}
