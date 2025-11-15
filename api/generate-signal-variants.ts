// Vercel Node Function: /api/generate-signal-variants
// Generates 2–3 conservative alternative trade setups for the same symbol,
// using the same account size and % risk, with strong safety guardrails.

interface VariantsBody {
    symbol?: string;
    accountSize?: number;
    tradeRiskPercent?: number;
    numVariations?: number;
  }
  
  function sendJson(res: any, status: number, data: unknown) {
    res.status(status).json(data);
  }
  
  export default async function handler(req: any, res: any) {
    // Basic CORS headers so we can call this from localhost:5173
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
      const bodyRaw = req.body;
      const body: VariantsBody =
        typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw || {};
  
      const symbol = (body.symbol || '').toString().toUpperCase();
      const accountSize = Number(body.accountSize);
      const tradeRiskPercentRaw = Number(body.tradeRiskPercent);
      let numVariations = Number(body.numVariations ?? 2);
  
      if (!symbol || !Number.isFinite(accountSize) || !Number.isFinite(tradeRiskPercentRaw)) {
        sendJson(res, 400, {
          error: 'Missing or invalid symbol, accountSize, or tradeRiskPercent.',
        });
        return;
      }
  
      // Clamp risk and variations to safe ranges
      const tradeRiskPercent = Math.max(0.1, Math.min(tradeRiskPercentRaw, 5));
      if (!Number.isFinite(numVariations) || numVariations < 1) numVariations = 2;
      if (numVariations > 3) numVariations = 3;
  
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        sendJson(res, 500, { error: 'OPENAI_API_KEY is not configured on the server.' });
        return;
      }
  
      const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  
      const systemPrompt = `
  You are an experienced, conservative trading strategist.
  
  You will propose several alternative trading setups for the same market.
  Each setup must:
  - Use the same account size and risk percentage provided by the user.
  - Respect basic risk management: no over-leverage, no martingale, no adding to losers.
  - Use realistic stop losses and take profits (no 0 values, no "infinite" distances).
  - Treat risk per trade above 3% as aggressive and mention that in the comment.
  - ALWAYS include a stop loss and clear take profit levels.
  - NEVER promise profit or certainty. This is not financial advice.
  `;
  
      const userPrompt = `
  Generate ${numVariations} alternative trading setups for the same symbol.
  
  Input:
  - Symbol: ${symbol}
  - Account size: ${accountSize}
  - Risk per trade (% of account): ${tradeRiskPercent}
  
  Assume this is a CFD/FX-style instrument where:
  - Position size can be any positive decimal (e.g. 0.1, 1.25).
  - You don't know the broker's contract size, so just output a practical position size number.
  
  For each setup, decide:
  - Side: "buy" or "sell"
  - Entry type: "market" or "limit"
  - Entry price (number)
  - Stop loss (number)
  - Take profit 1 (number)
  - Take profit 2 (number)
  - Timeframe: e.g. "H1", "H4", "D1"
  - Comment: 1–3 sentences explaining the idea and risk, without promising profits.
  
  Then compute simple risk metrics:
  - riskAmount: accountSize * (tradeRiskPercent/100)
  - positionSize: a reasonable size consistent with riskAmount and stop distance (you may approximate).
  
  IMPORTANT: Output JSON ONLY in this exact format:
  
  {
    "variations": [
      {
        "label": "Setup A",
        "signal": {
          "symbol": "XAUUSD",
          "side": "buy",
          "entryType": "market",
          "entryPrice": 1234.56,
          "stopLoss": 1230.00,
          "takeProfit1": 1240.00,
          "takeProfit2": 1245.00,
          "timeFrame": "H1",
          "comment": "Short explanation here..."
        },
        "risk": {
          "accountSize": 10000,
          "tradeRiskPercent": 2,
          "riskAmount": 200,
          "positionSize": 1.0
        }
      }
    ]
  }
  
  Use an array with ${numVariations} objects. Ensure all numeric fields are numbers, not strings.
  `;
  
      const completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
  
      if (!completionRes.ok) {
        const errText = await completionRes.text().catch(() => '');
        console.error('[generate-signal-variants] OpenAI error', {
          status: completionRes.status,
          body: errText,
        });
        sendJson(res, 502, { error: 'OpenAI API error while generating variations.' });
        return;
      }
  
      const data = (await completionRes.json()) as any;
      const content = data?.choices?.[0]?.message?.content;
  
      if (!content || typeof content !== 'string') {
        console.error('[generate-signal-variants] Missing content in OpenAI response');
        sendJson(res, 502, {
          error: 'Invalid response from OpenAI when generating variations.',
        });
        return;
      }
  
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        console.error(
          '[generate-signal-variants] Failed to parse JSON from OpenAI content',
          { content }
        );
        sendJson(res, 502, {
          error: 'Could not parse variations JSON from OpenAI.',
        });
        return;
      }
  
      const variations = Array.isArray(parsed.variations) ? parsed.variations : [];
  
      sendJson(res, 200, { variations });
    } catch (error: any) {
      console.error('[generate-signal-variants] Unexpected error', {
        message: error?.message ?? String(error),
      });
      sendJson(res, 500, {
        error: 'Internal error while generating signal variations.',
      });
    }
  }
  