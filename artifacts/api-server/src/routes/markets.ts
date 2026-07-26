import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, marketsTable } from "@workspace/db";
import { GetMarketsQueryParams, GetCandlesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/markets", async (req, res): Promise<void> => {
  const params = GetMarketsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(marketsTable).$dynamic();
  if (params.data.category) {
    query = query.where(eq(marketsTable.category, params.data.category));
  }
  const markets = await query;

  res.json(markets.map(m => ({
    ...m,
    bidPrice: parseFloat(m.bidPrice),
    askPrice: parseFloat(m.askPrice),
    spread: parseFloat(m.spread),
    change24h: parseFloat(m.change24h),
    volume24h: parseFloat(m.volume24h),
    high24h: parseFloat(m.high24h),
    low24h: parseFloat(m.low24h),
    pipSize: parseFloat(m.pipSize),
  })));
});

router.get("/markets/ticker", async (_req, res): Promise<void> => {
  const markets = await db.select().from(marketsTable);
  res.json(markets.map(m => ({
    symbol: m.symbol,
    price: parseFloat(m.bidPrice),
    change24h: parseFloat(m.change24h),
    direction: parseFloat(m.change24h) >= 0 ? "up" : "down",
  })));
});

router.get("/markets/candles", async (req, res): Promise<void> => {
  const params = GetCandlesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const symbol = params.data.symbol as string;
  const limit = params.data.limit ?? 100;

  const [market] = await db.select().from(marketsTable).where(eq(marketsTable.symbol, symbol)).limit(1);

  const basePrice = market ? parseFloat(market.bidPrice) : 1.0;
  const candles = generateCandles(basePrice, limit);

  res.json(candles);
});

function generateCandles(basePrice: number, count: number) {
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = 3600; // 1h candles
  const candles = [];
  let price = basePrice * 0.97;

  // FIXED: was `i = count; i >= 0` — produced count+1 candles. Now exactly `count`.
  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * intervalSeconds;
    const volatility = basePrice * 0.005;
    const open = price;
    const change = (Math.random() - 0.48) * volatility;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.random() * 1000000 + 500000;

    candles.push({
      time,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume: parseFloat(volume.toFixed(2)),
    });
    price = close;
  }
  return candles;
}

export default router;