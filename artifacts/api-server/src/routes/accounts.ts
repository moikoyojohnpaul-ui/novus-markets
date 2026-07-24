import { Router, type IRouter } from "express";
import { eq, and, sum, sql } from "drizzle-orm";
import { db, accountsTable, tradesTable } from "@workspace/db";
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

  const openPnl = openTrades.reduce((sum, t) => {
    // Simulate P&L from price movement
    const pnl = t.pnl ? parseFloat(t.pnl) : 0;
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
