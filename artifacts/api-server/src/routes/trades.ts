import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, accountsTable, tradesTable, revenueLedgerTable, marketsTable, platformSettingsTable } from "@workspace/db";
import {
  ExecuteTradeBody,
  GetTradesQueryParams,
  GetTradeSummaryQueryParams,
  CloseTradeParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/trades", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetTradesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(tradesTable)
    .where(eq(tradesTable.accountId, params.data.accountId))
    .$dynamic();

  if (params.data.status) {
    query = query.where(eq(tradesTable.status, params.data.status));
  }

  const trades = await query.orderBy(sql`${tradesTable.createdAt} DESC`);
  res.json(trades.map(formatTrade));
});

router.post("/trades", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = ExecuteTradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { accountId, symbol, side, type, lotSize, leverage, stopLoss, takeProfit, limitPrice } = parsed.data;

  const [account] = await db.select().from(accountsTable)
    .where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, req.userId!)))
    .limit(1);

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const [market] = await db.select().from(marketsTable).where(eq(marketsTable.symbol, symbol)).limit(1);
  const openPrice = market
    ? (side === "buy" ? parseFloat(market.askPrice) : parseFloat(market.bidPrice))
    : (limitPrice ?? 1.0);

  const contractSize = 100000;
  const margin = (openPrice * lotSize * contractSize) / leverage;

  const [settings] = await db.select().from(platformSettingsTable).limit(1);
  const spreadMarkup = settings ? parseFloat(settings.spreadMarkup.toString()) : 0.0002;
  const fee = openPrice * lotSize * contractSize * spreadMarkup;

  const balance = parseFloat(account.balance);
  if (balance < margin) {
    res.status(400).json({ error: "Insufficient margin" });
    return;
  }

  const tradeStatus = type === "market" ? "open" : "pending";

  const [trade] = await db.insert(tradesTable).values({
    accountId,
    symbol,
    side,
    type,
    lotSize: lotSize.toString(),
    openPrice: openPrice.toString(),
    stopLoss: stopLoss?.toString(),
    takeProfit: takeProfit?.toString(),
    leverage,
    margin: margin.toString(),
    fee: fee.toString(),
    status: tradeStatus,
    pnl: "0",
  }).returning();

  // Deduct margin from balance
  if (tradeStatus === "open") {
    await db.update(accountsTable)
      .set({ balance: (balance - margin - fee).toString() })
      .where(eq(accountsTable.id, accountId));

    // Log spread revenue
    await db.insert(revenueLedgerTable).values({
      type: "spread",
      amount: fee.toString(),
      description: `Spread on ${side} ${lotSize} ${symbol}`,
      userId: req.userId,
    });
  }

  res.status(201).json(formatTrade(trade));
});

router.post("/trades/:id/close", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, id)).limit(1);
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }
  if (trade.status !== "open") {
    res.status(400).json({ error: "Trade is not open" });
    return;
  }

  const [market] = await db.select().from(marketsTable).where(eq(marketsTable.symbol, trade.symbol)).limit(1);
  const closePrice = market
    ? (trade.side === "buy" ? parseFloat(market.bidPrice) : parseFloat(market.askPrice))
    : parseFloat(trade.openPrice);

  const priceDiff = trade.side === "buy"
    ? closePrice - parseFloat(trade.openPrice)
    : parseFloat(trade.openPrice) - closePrice;

  const contractSize = 100000;
  const pnl = priceDiff * parseFloat(trade.lotSize) * contractSize;

  const now = new Date();
  const [closed] = await db.update(tradesTable)
    .set({ status: "closed", closePrice: closePrice.toString(), pnl: pnl.toString(), closedAt: now })
    .where(eq(tradesTable.id, id))
    .returning();

  // Return margin + pnl to account
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, trade.accountId)).limit(1);
  if (account) {
    const newBalance = parseFloat(account.balance) + parseFloat(trade.margin) + pnl;
    await db.update(accountsTable).set({ balance: newBalance.toString() }).where(eq(accountsTable.id, trade.accountId));
  }

  res.json(formatTrade(closed));
});

router.get("/trades/summary", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetTradeSummaryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const trades = await db.select().from(tradesTable)
    .where(eq(tradesTable.accountId, params.data.accountId));

  const closed = trades.filter(t => t.status === "closed");
  const open = trades.filter(t => t.status === "open");
  const wins = closed.filter(t => parseFloat(t.pnl ?? "0") > 0);
  const totalPnl = closed.reduce((s, t) => s + parseFloat(t.pnl ?? "0"), 0);
  const totalFees = trades.reduce((s, t) => s + parseFloat(t.fee), 0);
  const pnls = closed.map(t => parseFloat(t.pnl ?? "0"));

  res.json({
    totalTrades: closed.length,
    openTrades: open.length,
    winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    totalPnl,
    totalFees,
    avgTradeSize: trades.length > 0 ? trades.reduce((s, t) => s + parseFloat(t.lotSize), 0) / trades.length : 0,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : null,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : null,
  });
});

function formatTrade(t: typeof tradesTable.$inferSelect) {
  return {
    ...t,
    lotSize: parseFloat(t.lotSize),
    openPrice: parseFloat(t.openPrice),
    closePrice: t.closePrice ? parseFloat(t.closePrice) : null,
    stopLoss: t.stopLoss ? parseFloat(t.stopLoss) : null,
    takeProfit: t.takeProfit ? parseFloat(t.takeProfit) : null,
    margin: parseFloat(t.margin),
    pnl: t.pnl ? parseFloat(t.pnl) : null,
    fee: parseFloat(t.fee),
    closedAt: t.closedAt?.toISOString() ?? null,
  };
}

export default router;
