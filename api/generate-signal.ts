// Vercel Function: /api/generate-signal
// Uses OpenAI (via fetch) to generate an AI-powered trading signal.
// If OpenAI returns 429 (Too Many Requests), we fall back to a simple
// rule-based signal so the app still works.

type SignalSide = 'buy' | 'sell';

interface SignalRequestBody {
  symbol?: string;
  accountSize?: number;
  tradeRiskPercent?: number;
}

interface RiskInfo {
  accountSize: number;
  tradeRiskPercent: number;
  riskAmount: number;
  positionSize: number;
}

interface SignalInfo {
  symbol: string;
  side: SignalSide;
  entryType: 'market' | 'limit';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  timeFrame: string;
  comment: string;
}

interface SignalResponseBody {
  signal: SignalInfo;
  risk: RiskInfo;
}

// CORS headers (so frontend on localhost or other domains can call this)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper to return JSON with CORS headers
function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

// Handle OPTIONS preflight requests
export function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// ---- Fallback signal generator (no AI, no external API) ----

function buildFallbackSignal(
  symbol: string,
  accountSize: number,
  tradeRiskPercent: number
): SignalResponseBody {
  const normalizedSymbol = symbol.trim().toUpperCase();

  const riskAmount = (accountSize * tradeRiskPercent) / 100;

  // Very rough base price heuristics just to make numbers look realistic.
  let basePrice = 100;
  if (normalizedSymbol.includes('XAU')) basePrice = 2300;
  else if (normalizedSymbol.includes('XAG')) basePrice = 28;
  else if (normalizedSymbol.includes('BTC')) basePrice = 70000;
  else if (normalizedSymbol.includes('ETH')) basePrice = 3500;
  else if (normalizedSymbol.includes('US30')) basePrice = 39000;
  else if (normalizedSymbol.includes('US100')) basePrice = 18000;
  else if (normalizedSymbol.includes('SPX') || normalizedSymbol.includes('US500'))
    basePrice = 5200;
  else if (normalizedSymbol.endsWith('JPY')) basePrice = 150;
  else if (normalizedSymbol.startsWith('EUR') || normalizedSymbol.startsWith('GBP') || normalizedSymbol.startsWith('AUD') || normalizedSymbol.startsWith('NZD') || normalizedSymbol.startsWith('USD'))
    basePrice = 1.1;

  // Simple trend bias: odd hash → buy, even → sell
  const hash = Array.from(normalizedSymbol).reduce(
    (acc, c) => acc + c.charCodeAt(0),
    0
  );
  const side: SignalSide = hash % 2 === 0 ? 'buy' : 'sell';

  const slDistancePct = 0.01; // 1% of price
  const entryPrice = basePrice;
  const slDistance = basePrice * slDistancePct;

  let stopLoss: number;
  let takeProfit1: number;
  let takeProfit2: number;

  if (side === 'buy') {
    stopLoss = entryPrice - slDistance;
    takeProfit1 = entryPrice + slDistance * 2;
    takeProfit2 = entryPrice + slDistance * 3;
  } else {
    stopLoss = entryPrice + slDistance;
    takeProfit1 = entryPrice - slDistance * 2;
    takeProfit2 = entryPrice - slDistance * 3;
  }

  const rawPositionSize =
    slDistance > 0 ? riskAmount / slDistance : riskAmount;
  const positionSize = Number(rawPositionSize.toFixed(2));

  const signal: SignalInfo = {
    symbol: normalizedSymbol,
    side,
    entryType: 'market',
    entryPrice: Number(entryPrice.toFixed(5)),
    stopLoss: Number(stopLoss.toFixed(5)),
    takeProfit1: Number(takeProfit1.toFixed(5)),
    takeProfit2: Number(takeProfit2.toFixed(5)),
    timeFrame: 'H1',
    comment:
      'Fallback signal generated because the AI quota was exceeded. Levels are based on simple rule-based logic, not live market analysis. Always do your own research.',
  };

  const risk: RiskInfo = {
    accountSize,
    tradeRiskPercent,
    riskAmount: Number(riskAmount.toFixed(2)),
    positionSize,
  };

  return { signal, risk };
}

// ---- Main POST handler ----

export async function POST(request: Request): Promise<Response> {
  try {
    // 1) Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('Missing OPENAI_API_KEY in environment');
      // Even if key is missing, we can still return a fallback signal
      const body: SignalRequestBody = await request.json().catch(() => ({}));
      const { symbol, accountSize, tradeRiskPercent } = body;
      if (
        symbol &&
        typeof symbol === 'string' &&
        typeof accountSize === 'number' &&
        typeof tradeRiskPercent === 'number'
      ) {
        const fallback = buildFallbackSignal(
          symbol,
          accountSize,
          tradeRiskPercent
        );
        return json(fallback, { status: 200 });
      }

      return json(
        {
          error:
            'Server misconfiguration: missing OpenAI API key and invalid request body.',
        },
        { status: 500 }
      );
    }

    // 2) Read and validate request body
    const body: SignalRequestBody = await request.json().catch(() => ({}));

    const { symbol, accountSize, tradeRiskPercent } = body;

    if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
      return json({ error: 'symbol is required (string)' }, { status: 400 });
    }

    if (
      typeof accountSize !== 'number' ||
      !Number.isFinite(accountSize) ||
      accountSize <= 0
    ) {
      return json(
        { error: 'accountSize must be a positive number' },
        { status: 400 }
      );
    }

    if (
      typeof tradeRiskPercent !== 'number' ||
      !Number.isFinite(tradeRiskPercent) ||
      tradeRiskPercent <= 0 ||
      tradeRiskPercent > 100
    ) {
      return json(
        { error: 'tradeRiskPercent must be between 0 and 100' },
        { status: 400 }
      );
    }

    const normalizedSymbol = symbol.trim().toUpperCase();
    const riskAmount = (accountSize * tradeRiskPercent) / 100;

    // 3) Build prompts
    const systemPrompt = `
You are a professional trading signal generator for FX, indices, metals and crypto.
Your job is to create short-term trading ideas based on the user's inputs.

CRITICAL RULES:
- You MUST respond with a single valid JSON object only. No extra text, no explanations outside JSON.
- The JSON structure MUST be:

{
  "signal": {
    "symbol": "<string, same as requested symbol>",
    "side": "buy" | "sell",
    "entryType": "market" | "limit",
    "entryPrice": <number>,
    "stopLoss": <number>,
    "takeProfit1": <number>,
    "takeProfit2": <number>,
    "timeFrame": "<string, e.g. 'M15', 'H1', 'H4'>",
    "comment": "<short explanation of the idea and key risks>"
  },
  "risk": {
    "accountSize": <number>,
    "tradeRiskPercent": <number>,
    "riskAmount": <number>,
    "positionSize": <number>
  }
}

- All numeric fields must be numbers, not strings.
- "riskAmount" MUST equal accountSize * (tradeRiskPercent / 100).
- "positionSize" should be a sensible size given the symbol and stop-loss distance, rounded to 2 decimals.
- Use realistic price levels for the instrument (do not use tiny or huge nonsense numbers).
- stopLoss and takeProfit prices must make sense relative to entry and side:
  - For a BUY: stopLoss < entryPrice < takeProfit1 < takeProfit2
  - For a SELL: stopLoss > entryPrice > takeProfit1 > takeProfit2
`;

    const userPrompt = `
Generate ONE trading signal using the following inputs:

- Symbol: ${normalizedSymbol}
- Account size: ${accountSize}
- Risk per trade (%): ${tradeRiskPercent}

Assume the user wants a short-term intraday or swing trade (H1 or H4) with a clear idea, proper stop loss, and two take-profit targets.

Follow the JSON structure exactly as described in the system instructions.
`;

    // 4) Call OpenAI via fetch
    const openaiResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      }
    );

    // 4a) If OpenAI is rate-limited (429), fall back to local logic
    if (openaiResponse.status === 429) {
      console.warn('OpenAI returned 429 Too Many Requests - using fallback');
      const fallback = buildFallbackSignal(
        normalizedSymbol,
        accountSize,
        tradeRiskPercent
      );
      return json(fallback, { status: 200 });
    }

    // 4b) Any other non-OK response is treated as an error
    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error(
        'OpenAI API error',
        openaiResponse.status,
        openaiResponse.statusText,
        errText
      );
      return json(
        {
          error: `OpenAI API error (${openaiResponse.status} ${openaiResponse.statusText}). Check your API key, model name, or quota.`,
        },
        { status: 500 }
      );
    }

    const completion: any = await openaiResponse.json();
    const content = completion?.choices?.[0]?.message?.content;

    if (!content) {
      console.error('OpenAI returned no content', completion);
      // As a safety net, still provide fallback
      const fallback = buildFallbackSignal(
        normalizedSymbol,
        accountSize,
        tradeRiskPercent
      );
      return json(fallback, { status: 200 });
    }

    // 5) Parse and normalise the AI JSON
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error('Failed to parse OpenAI JSON:', content, err);
      const fallback = buildFallbackSignal(
        normalizedSymbol,
        accountSize,
        tradeRiskPercent
      );
      return json(fallback, { status: 200 });
    }

    const signal: SignalInfo = {
      symbol: normalizedSymbol,
      side: parsed?.signal?.side === 'sell' ? 'sell' : 'buy',
      entryType: parsed?.signal?.entryType === 'limit' ? 'limit' : 'market',
      entryPrice: Number(parsed?.signal?.entryPrice) || 0,
      stopLoss: Number(parsed?.signal?.stopLoss) || 0,
      takeProfit1: Number(parsed?.signal?.takeProfit1) || 0,
      takeProfit2: Number(parsed?.signal?.takeProfit2) || 0,
      timeFrame: parsed?.signal?.timeFrame || 'H1',
      comment:
        parsed?.signal?.comment ||
        'AI-generated trading idea. Always do your own research.',
    };

    const aiRiskAmount = Number(parsed?.risk?.riskAmount);
    const risk: RiskInfo = {
      accountSize,
      tradeRiskPercent,
      riskAmount:
        Number.isFinite(aiRiskAmount) && aiRiskAmount > 0
          ? aiRiskAmount
          : Number(riskAmount.toFixed(2)),
      positionSize:
        Number(parsed?.risk?.positionSize) > 0
          ? Number(parsed.risk.positionSize)
          : Number(
              (
                riskAmount /
                Math.max(Math.abs(signal.entryPrice - signal.stopLoss), 1)
              ).toFixed(2)
            ),
    };

    const responseBody: SignalResponseBody = {
      signal,
      risk,
    };

    return json(responseBody, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/generate-signal:', error);
    return json(
      {
        error:
          'Internal error while generating signal.' +
          (error?.message ? ` Details: ${error.message}` : ''),
      },
      { status: 500 }
    );
  }
}
