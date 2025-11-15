// Vercel Node Function: /api/generate-signal
// Generates a single AI-powered trading signal on the 15-minute timeframe (M15)
// using OpenAI. Returns a { signal, risk } JSON object.
//
// Expected request body (JSON):
// {
//   "symbol": "XAUUSD",
//   "accountSize": 10000,
//   "tradeRiskPercent": 2
// }
//
// Response body (JSON):
// {
//   "signal": { ... },
//   "risk": { ... }
// }

interface GenerateBody {
  symbol?: string;
  accountSize?: number;
  tradeRiskPercent?: number;
}

function sendJson(res: any, status: number, data: unknown) {
  res.status(status).json(data);
}

export default async function handler(req: any, res: any) {
  // Allow calls from localhost:5173 and your Vercel frontends
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
      sendJson(res, 400, {
        error: 'Missing or invalid symbol, accountSize, or tradeRiskPercent.',
      });
      return;
    }

    // Clamp the risk to a sensible range (0.1% – 5%)
    const tradeRiskPercent = Math.max(0.1, Math.min(tradeRiskPercentRaw, 5));

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      sendJson(res, 500, {
        error: 'OPENAI_API_KEY is not configured on the server.',
      });
      return;
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    // 🧠 System prompt: 15-minute intraday logic + guardrails
    const systemPrompt = `
You are a cautious trading assistant generating INTRADAY trading ideas.

You MUST:
- Work strictly on the 15-minute timeframe (M15).
- Assume the user is looking for short-term trades (scalps / intraday swings), not multi-day positions.
- Always include: side (buy/sell), entry type (market/limit), entry price, stop loss, TP1, TP2, timeframe, and a brief comment.
- Set timeFrame to "M15" in the JSON.
- Respect basic risk management:
  - Use realistic stop-loss and take-profit distances for a 15-minute chart.
  - Treat risk per trade above 3% as aggressive and mention that in the comment.
  - NEVER suggest over-leverage, martingale, or adding to losing positions.
- Emphasise that this is not financial advice and the user must manage their own risk.
`;

    // 🧠 User prompt: single signal + risk block, JSON shape our frontend expects
    const userPrompt = `
Generate ONE trading idea for the following:

Symbol: ${symbol}
Account size: ${accountSize}
Risk per trade (% of account): ${tradeRiskPercent}

You don't know the broker's contract size, so just output a reasonable positionSize number.
Assume this is a CFD/FX-style product where positionSize can be any positive decimal.

Return JSON ONLY in this exact structure:

{
  "signal": {
    "symbol": "XAUUSD",
    "side": "buy",
    "entryType": "market",
    "entryPrice": 1234.56,
    "stopLoss": 1230.00,
    "takeProfit1": 1240.00,
    "takeProfit2": 1245.00,
    "timeFrame": "M15",
    "comment": "Short explanation of the idea and risk..."
  },
  "risk": {
    "accountSize": 10000,
    "tradeRiskPercent": 2,
    "riskAmount": 200,
    "positionSize": 1.0
  }
}

Rules:
- All numeric fields must be numbers, NOT strings.
- timeFrame MUST be "M15".
- riskAmount = accountSize * (tradeRiskPercent / 100).
`;

    const completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!completionRes.ok) {
      const errText = await completionRes.text().catch(() => '');
      console.error('[generate-signal] OpenAI error', {
        status: completionRes.status,
        body: errText,
      });
      sendJson(res, 502, { error: 'OpenAI API error while generating signal.' });
      return;
    }

    const data = (await completionRes.json()) as any;
    const content = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      console.error('[generate-signal] Missing content in OpenAI response');
      sendJson(res, 502, { error: 'Invalid response from OpenAI.' });
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error('[generate-signal] Failed to parse JSON from OpenAI', {
        content,
      });
      sendJson(res, 502, {
        error: 'Could not parse signal JSON from OpenAI.',
      });
      return;
    }

    const signal = parsed.signal || {};
    const risk = parsed.risk || {};

    // ✅ Enforce M15 timeframe even if the model forgets
    signal.timeFrame = 'M15';

    // ✅ Ensure core risk fields are present / numeric
    risk.accountSize = Number.isFinite(Number(risk.accountSize))
      ? Number(risk.accountSize)
      : accountSize;

    risk.tradeRiskPercent = Number.isFinite(Number(risk.tradeRiskPercent))
      ? Number(risk.tradeRiskPercent)
      : tradeRiskPercent;

    risk.riskAmount =
      Number(risk.riskAmount) ||
      risk.accountSize * (risk.tradeRiskPercent / 100);

    sendJson(res, 200, { signal, risk });
  } catch (error: any) {
    console.error('[generate-signal] Unexpected error', {
      message: error?.message ?? String(error),
    });
    sendJson(res, 500, {
      error: 'Internal error while generating signal.',
    });
  }
}
