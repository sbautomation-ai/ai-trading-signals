import type { Handler } from "@netlify/functions";
import OpenAI from "openai";
import { calcUnits, toLots, calcDerived } from "../../src/lib/calc";

// --- lightweight cache to soften API rate limits (resets on cold start) ---
const cache: Record<string, { price: number; ts: number }> = {};
const PRICE_TTL_MS = 30_000; // 30s cache

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function now() { return Date.now(); }
function within(ttl: number, t: number) { return now() - t < ttl; }
function randBetween(min: number, max: number) { return min + Math.random() * (max - min); }

async function fetchPrice(symbol: string): Promise<number> {
  const key = process.env.ALPHA_VANTAGE_KEY;
  const sym = symbol.trim().toUpperCase().replace(/\s+/g, "");
  if (cache[sym] && within(PRICE_TTL_MS, cache[sym].ts)) return cache[sym].price;

  const toPair = (s: string) => {
    const clean = s.replace("/", "");
    if (clean === "XAUUSD") return { from: "XAU", to: "USD" };
    if (clean === "BTCUSD") return { from: "BTC", to: "USD" };
    if (clean === "EURUSD") return { from: "EUR", to: "USD" };
    if (clean === "GBPUSD") return { from: "GBP", to: "USD" };
    const parts = s.includes("/") ? s.split("/") : [s.slice(0,3), s.slice(3,6)];
    return { from: parts[0].toUpperCase(), to: (parts[1] || "USD").toUpperCase() };
  };

  if (key) {
    try {
      const { from, to } = toPair(sym);
      const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${key}`;
      const res = await fetch(url);
      const json = await res.json();
      const p = Number(json?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"]);
      if (!Number.isNaN(p) && p > 0) {
        cache[sym] = { price: p, ts: now() };
        return p;
      }
    } catch {}
  }
  const base = sym.includes("XAU") ? 2350 : sym.includes("BTC") ? 55000 : 1.10;
  const mock = randBetween(base * 0.99, base * 1.01);
  cache[sym] = { price: mock, ts: now() };
  return mock;
}

// AI suggestion type
type AiSuggestion = {
  direction: "buy" | "sell";
  orderType: "market" | "limit";
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
};

async function aiSuggestSignal(input: { symbol: string; price: number; accountSize: number; riskPercent: number; }): Promise<AiSuggestion> {
  const system = `You propose one trade idea for the given symbol. Rules:\n- Return ONLY JSON matching the schema.\n- Base SL/TP on current price with sane R:R (TP1 ~1R-1.5R, TP2 ~2R+).\n- No disclaimers; numbers only. Direction in {buy,sell}, orderType in {market,limit}.`;

  const schema = {
    name: "TradeSignal",
    strict: true,
    schema: {
      type: "object",
      properties: {
        direction: { enum: ["buy", "sell"], type: "string" },
        orderType: { enum: ["market", "limit"], type: "string" },
        entryPrice: { type: "number" },
        stopLoss: { type: "number" },
        takeProfit1: { type: "number" },
        takeProfit2: { type: "number" }
      },
      required: ["direction", "orderType", "entryPrice", "stopLoss", "takeProfit1", "takeProfit2"],
      additionalProperties: false
    }
  } as const;

  const { symbol, price, accountSize, riskPercent } = input;

  const resp = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.2,
    input: [
      { role: "system", content: system },
      { role: "user", content: `Symbol: ${symbol}\nPrice: ${price}\nAccount size: ${accountSize}\nRisk%: ${riskPercent}\nConstraints: realistic SL/TP relative to price; TP1 modest, TP2 stretch.` },
    ],
    response_format: { type: "json_schema", json_schema: schema },
  });

  const out = (resp as any).output?.[0]?.content?.[0]?.text ?? "{}";
  return JSON.parse(out) as AiSuggestion;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const { symbol, accountSize, riskPercent } = JSON.parse(event.body || "{}");
  if (!symbol || !accountSize || !riskPercent) {
    return { statusCode: 400, body: JSON.stringify({ error: "symbol, accountSize, riskPercent required" }) };
  }

  const live = await fetchPrice(symbol);

  let idea: AiSuggestion | null = null;
  try {
    idea = await aiSuggestSignal({ symbol, price: live, accountSize, riskPercent });
  } catch {}

  // Fallback heuristic if AI fails
  const direction = idea?.direction ?? (Math.random() > 0.5 ? "buy" : "sell");
  const orderType = idea?.orderType ?? "market";
  const entryPrice = idea?.entryPrice ?? live;
  const stopLoss = idea?.stopLoss ?? (direction === "buy" ? live * 0.985 : live * 1.015);
  const tp1 = idea?.takeProfit1 ?? (direction === "buy" ? live * 1.01 : live * 0.99);
  const tp2 = idea?.takeProfit2 ?? (direction === "buy" ? live * 1.02 : live * 0.98);

  const { units, riskAmountUSD } = calcUnits({ accountSize, riskPercent, entryPrice, stopLoss, symbol });
  const lotSize = toLots(units, symbol);
  const { profitTP1USD, profitTP2USD, rrTP1, rrTP2 } = calcDerived({ direction, entryPrice, stopLoss, tp1, tp2, units, symbol, riskAmountUSD });

  const payload = {
    symbol,
    direction,
    orderType,
    entryPrice,
    stopLoss,
    takeProfit1: tp1,
    takeProfit2: tp2,
    timestamp: new Date().toISOString(),
    accountSize,
    riskPercent,
    lotSize,
    units,
    notes: ["When trade hits TP1, move SL to entry"],
    riskAmountUSD,
    profitTP1USD,
    profitTP2USD,
    rrTP1,
    rrTP2,
  };

  return { statusCode: 200, body: JSON.stringify(payload) };
};