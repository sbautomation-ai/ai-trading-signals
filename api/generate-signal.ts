// Vercel Function: /api/generate-signal
// Uses OpenAI to generate an AI-powered trading signal based on:
// - symbol
// - accountSize
// - tradeRiskPercent
//
// The function:
// - Handles CORS (for localhost / GitHub Pages etc.)
// - Accepts POST requests with JSON body: { symbol, accountSize, tradeRiskPercent }
// - Calls OpenAI (gpt-4.1-mini) with a structured prompt
// - Returns JSON with the same shape your frontend already expects:
//   { signal: { ... }, risk: { ... } }

import OpenAI from 'openai';

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

// Main POST handler
export async function POST(request: Request): Promise<Response> {
  try {
    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('Missing OPENAI_API_KEY in environment');
      return json(
        {
          error:
            'Server misconfiguration: missing OpenAI API key. Please set OPENAI_API_KEY in your environment.',
        },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const body: SignalRequestBody = await request.json();

    const { symbol, accountSize, tradeRiskPercent } = body;

    // Basic validation (keep it strict so we don't send garbage to OpenAI)
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

    // We still compute the basic riskAmount ourselves, to keep it consistent.
    const riskAmount = (accountSize * tradeRiskPercent) / 100;

    // Build a prompt that forces the model to output clean JSON
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

    // Call OpenAI Chat Completions with JSON response format
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error('OpenAI returned no content', completion);
      return json(
        { error: 'Failed to generate signal from AI (no content).' },
        { status: 500 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error('Failed to parse OpenAI JSON:', content, err);
      return json(
        { error: 'AI response was not valid JSON. Please try again.' },
        { status: 500 }
      );
    }

    // Basic shape checks and patching to ensure we conform to SignalResponseBody
    const signal: SignalInfo = {
      symbol: normalizedSymbol,
      side:
        parsed?.signal?.side === 'sell'
          ? 'sell'
          : 'buy', // default to 'buy' if weird
      entryType:
        parsed?.signal?.entryType === 'limit' ? 'limit' : 'market',
      entryPrice: Number(parsed?.signal?.entryPrice) || 0,
      stopLoss: Number(parsed?.signal?.stopLoss) || 0,
      takeProfit1: Number(parsed?.signal?.takeProfit1) || 0,
      takeProfit2: Number(parsed?.signal?.takeProfit2) || 0,
      timeFrame: parsed?.signal?.timeFrame || 'H1',
      comment:
        parsed?.signal?.comment ||
        'AI-generated trading idea. Always do your own research.',
    };

    // If AI gave nonsense prices, you might want to add more defensive checks here.
    // For now we trust the model within reason.

    const aiRiskAmount = Number(parsed?.risk?.riskAmount);
    const risk: RiskInfo = {
      accountSize,
      tradeRiskPercent,
      // Prefer our own riskAmount calculation to keep it consistent
      riskAmount: Number.isFinite(aiRiskAmount) && aiRiskAmount > 0
        ? aiRiskAmount
        : Number(riskAmount.toFixed(2)),
      positionSize:
        Number(parsed?.risk?.positionSize) > 0
          ? Number(parsed.risk.positionSize)
          : Number((riskAmount / Math.max(Math.abs(signal.entryPrice - signal.stopLoss), 1)).toFixed(2)),
    };

    const responseBody: SignalResponseBody = {
      signal,
      risk,
    };

    return json(responseBody, { status: 200 });
  } catch (error) {
    console.error('Error in /api/generate-signal:', error);
    return json(
      { error: 'Internal error while generating signal' },
      { status: 500 }
    );
  }
}
