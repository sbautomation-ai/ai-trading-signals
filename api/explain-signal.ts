// Vercel Node Function: /api/explain-signal
// Takes an existing signal + explanationMode and returns a refined explanation string,
// with strong risk/safety guardrails.

type ExplanationMode = 'brief' | 'detailed' | 'risk';

interface ExplainBody {
  signalData?: any;
  explanationMode?: ExplanationMode;
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
    // Preflight request
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const bodyRaw = req.body;
    const body: ExplainBody =
      typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw || {};

    const mode: ExplanationMode = body.explanationMode ?? 'brief';
    const signal = body.signalData?.signal;
    const risk = body.signalData?.risk;

    if (!signal || !risk) {
      sendJson(res, 400, { error: 'Missing signal or risk data in request body.' });
      return;
    }

    const {
      symbol,
      side,
      entryType,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      timeFrame,
    } = signal;

    const {
      accountSize,
      tradeRiskPercent,
      riskAmount,
      positionSize,
    } = risk;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      sendJson(res, 500, { error: 'OPENAI_API_KEY is not configured on the server.' });
      return;
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    let styleInstruction: string;
    switch (mode) {
      case 'detailed':
        styleInstruction =
          'Write a detailed but clear explanation (around 200–250 words) with short paragraphs.';
        break;
      case 'risk':
        styleInstruction =
          'Focus mainly on risk management: why the stop loss and position size are conservative, what could go wrong, and how to manage the trade safely. 150–200 words.';
        break;
      case 'brief':
      default:
        styleInstruction =
          'Write a short, punchy explanation (max 120 words) in 3–5 bullet points.';
        break;
    }

    const systemPrompt = `
You are a professional trading coach and risk manager.

You are given a structured trading setup and risk parameters. Your job is to explain the idea
to a retail trader in a conservative, risk-aware way. You MUST:
- Emphasize that this is not financial advice.
- Highlight the risk per trade and that the user should not over-leverage.
- Treat anything above 3% risk per trade as aggressive and clearly warn about it.
- Avoid promising profits or certainty.
- Encourage using a stop loss, respecting position size, and being prepared for losses.
`;

    const userPrompt = `
Here is the trading setup:

Symbol: ${symbol}
Side: ${side}
Order type: ${entryType}
Timeframe: ${timeFrame}
Entry: ${entryPrice}
Stop loss: ${stopLoss}
Take profit 1: ${takeProfit1}
Take profit 2: ${takeProfit2}

Account size: ${accountSize}
Risk per trade (% of account): ${tradeRiskPercent}
Risk amount in currency: ${riskAmount}
Position size (units or lots): ${positionSize}

Explanation style requested: ${mode.toUpperCase()}.

${styleInstruction}

Write in plain English, no jargon, and no code. Do NOT restate the raw numbers line by line;
assume the user can already see them. Focus on the thinking, risk, and trade idea.
`;

    const completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!completionRes.ok) {
      const errText = await completionRes.text().catch(() => '');
      console.error('[explain-signal] OpenAI error', {
        status: completionRes.status,
        body: errText,
      });
      sendJson(res, 502, { error: 'OpenAI API error while generating explanation.' });
      return;
    }

    const data = (await completionRes.json()) as any;
    const explanation =
      data?.choices?.[0]?.message?.content?.trim() ??
      'No explanation could be generated. Please try again.';

    sendJson(res, 200, { explanation });
  } catch (error: any) {
    console.error('[explain-signal] Unexpected error', {
      message: error?.message ?? String(error),
    });
    sendJson(res, 500, { error: 'Internal error while generating explanation.' });
  }
}
