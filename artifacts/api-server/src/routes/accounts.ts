import { Router, type IRouter } from "express";
import { eq, and, sum, sql } from "drizzle-orm";
import { db, accountsTable, tradesTable, marketsTable } from "@workspace/db";
import { GetAccountSummaryQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/accounts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const accounts = await db.select().from(accountsTable).where(eq(accountsTable.userId, req.userId!));
  res.json(accounts.map(a => ({
    ...a,
    balance: parseFloat(a.balance),
  })));
});

router.get("/accounts/summary", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetAccountSummaryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [account] = await db.select().from(accountsTable)
    .where(and(eq(accountsTable.id, params.data.accountId), eq(accountsTable.userId, req.userId!)))
    .limit(1);

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  // Calculate open PnL from open trades
  const openTrades = await db.select().from(tradesTable)
    .where(and(eq(tradesTable.accountId, params.data.accountId), eq(tradesTable.status, "open")));

  const markets = await db.select().from(marketsTable);
  const marketMap = new Map(markets.map(m => [m.symbol, m]));

  const openPnl = openTrades.reduce((sum, t) => {
    const m = marketMap.get(t.symbol);
    if (!m) return sum;
    const closePrice = t.side === "buy" ? parseFloat(m.bidPrice) : parseFloat(m.askPrice);
    const priceDiff = t.side === "buy" 
      ? closePrice - parseFloat(t.openPrice) 
      : parseFloat(t.openPrice) - closePrice;
    const pnl = priceDiff * parseFloat(t.lotSize) * 100000;
    return sum + pnl;
  }, 0);

  const balance = parseFloat(account.balance);
  const margin = openTrades.reduce((s, t) => s + parseFloat(t.margin), 0);
  const equity = balance + openPnl;
  const freeMargin = equity - margin;
  const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;

  res.json({
    balance,
    equity,
    margin,
    freeMargin,
    marginLevel,
    openPnl,
  });
});

export default router;
