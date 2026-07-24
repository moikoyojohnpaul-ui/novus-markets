import { Router, type IRouter } from "express";
import { eq, sql, sum, count, ilike } from "drizzle-orm";
import {
  db, usersTable, accountsTable, transactionsTable, tradesTable,
  kycTable, revenueLedgerTable, platformSettingsTable,
} from "@workspace/db";
import {
  UpdateAdminSettingsBody,
  GetAdminUsersQueryParams,
  GetAdminDepositsQueryParams,
  AdjustUserBalanceParams,
  AdjustUserBalanceBody,
  UpdateKycDecisionParams,
  UpdateKycDecisionBody,
} from "@workspace/api-zod";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/overview", requireAdmin, async (_req, res): Promise<void> => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [pendingKyc] = await db.select({ count: count() }).from(kycTable).where(eq(kycTable.status, "pending"));
  const [pendingDeposits] = await db.select({ count: count() }).from(transactionsTable)
    .where(eq(transactionsTable.status, "pending"));
  const revenueRows = await db.select({ total: sum(revenueLedgerTable.amount) }).from(revenueLedgerTable);
  const [volumeRow] = await db.select({ total: sum(tradesTable.margin) }).from(tradesTable);

  const activeTraders = await db.selectDistinct({ userId: tradesTable.accountId }).from(tradesTable)
    .where(eq(tradesTable.status, "open"));

  res.json({
    totalUsers: userCount.count,
    totalVolume: parseFloat(volumeRow.total ?? "0"),
    totalRevenue: parseFloat(revenueRows[0]?.total ?? "0"),
    pendingKyc: pendingKyc.count,
    pendingDeposits: pendingDeposits.count,
    activeTraders: activeTraders.length,
  });
});

router.get("/admin/revenue", requireAdmin, async (_req, res): Promise<void> => {
  const [totalRow] = await db.select({ total: sum(revenueLedgerTable.amount) }).from(revenueLedgerTable);
  const [feeRow] = await db.select({ total: sum(revenueLedgerTable.amount) }).from(revenueLedgerTable)
    .where(eq(revenueLedgerTable.type, "deposit_fee"));
  const [spreadRow] = await db.select({ total: sum(revenueLedgerTable.amount) }).from(revenueLedgerTable)
    .where(eq(revenueLedgerTable.type, "spread"));
  const [tradeCount] = await db.select({ count: count() }).from(tradesTable);

  const entries = await db.select().from(revenueLedgerTable)
    .orderBy(sql`${revenueLedgerTable.createdAt} DESC`)
    .limit(20);

  res.json({
    totalRevenue: parseFloat(totalRow.total ?? "0"),
    depositFees: parseFloat(feeRow.total ?? "0"),
    spreadRevenue: parseFloat(spreadRow.total ?? "0"),
    tradeCount: tradeCount.count,
    recentEntries: entries.map(e => ({
      ...e,
      amount: parseFloat(e.amount),
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

router.patch("/admin/settings", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateAdminSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, string | number> = {};
  if (parsed.data.depositFeeRate !== undefined) updateData.depositFeeRate = parsed.data.depositFeeRate.toString();
  if (parsed.data.spreadMarkup !== undefined) updateData.spreadMarkup = parsed.data.spreadMarkup.toString();
  if (parsed.data.minDeposit !== undefined) updateData.minDeposit = parsed.data.minDeposit.toString();
  if (parsed.data.maxLeverage !== undefined) updateData.maxLeverage = parsed.data.maxLeverage;
  if (parsed.data.cryptoWalletUsdt) updateData.cryptoWalletUsdt = parsed.data.cryptoWalletUsdt;
  if (parsed.data.cryptoWalletBtc) updateData.cryptoWalletBtc = parsed.data.cryptoWalletBtc;
  if (parsed.data.mpesaPaybill) updateData.mpesaPaybill = parsed.data.mpesaPaybill;

  const existing = await db.select({ id: platformSettingsTable.id }).from(platformSettingsTable).limit(1);
  let settings;
  if (existing.length === 0) {
    [settings] = await db.insert(platformSettingsTable).values(updateData as any).returning();
  } else {
    [settings] = await db.update(platformSettingsTable).set(updateData as any)
      .where(eq(platformSettingsTable.id, existing[0].id)).returning();
  }

  res.json({
    ...settings,
    depositFeeRate: parseFloat(settings.depositFeeRate.toString()),
    spreadMarkup: parseFloat(settings.spreadMarkup.toString()),
    minDeposit: parseFloat(settings.minDeposit.toString()),
    demoBalance: parseFloat(settings.demoBalance.toString()),
  });
});

router.get("/admin/users", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = GetAdminUsersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let usersQuery = db.select().from(usersTable).$dynamic();
  if (params.data.search) {
    usersQuery = usersQuery.where(
      sql`${usersTable.email} ILIKE ${`%${params.data.search}%`} OR ${usersTable.firstName} ILIKE ${`%${params.data.search}%`}`
    );
  }

  const users = await usersQuery;
  const result = await Promise.all(users.map(async (u) => {
    const [kyc] = await db.select().from(kycTable).where(eq(kycTable.userId, u.id)).limit(1);
    const [realAccount] = await db.select().from(accountsTable)
      .where(eq(accountsTable.userId, u.id)).limit(1);
    const [tradeCount] = await db.select({ count: count() }).from(tradesTable)
      .where(eq(tradesTable.accountId, realAccount?.id ?? 0));
    const [totalDeps] = await db.select({ total: sum(transactionsTable.netAmount) }).from(transactionsTable)
      .where(eq(transactionsTable.userId, u.id));

    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      kycStatus: kyc?.status ?? "unverified",
      totalDeposits: parseFloat(totalDeps.total ?? "0"),
      totalTrades: tradeCount.count,
      realBalance: realAccount ? parseFloat(realAccount.balance) : 0,
      createdAt: u.createdAt.toISOString(),
    };
  }));

  // Filter by kycStatus if requested
  const filtered = params.data.kycStatus
    ? result.filter(u => u.kycStatus === params.data.kycStatus)
    : result;

  res.json(filtered);
});

router.patch("/admin/users/:id/balance", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsValidated = AdjustUserBalanceParams.safeParse({ id: parseInt(raw, 10) });
  const bodyValidated = AdjustUserBalanceBody.safeParse(req.body);

  if (!paramsValidated.success || !bodyValidated.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [account] = await db.select().from(accountsTable)
    .where(eq(accountsTable.userId, paramsValidated.data.id)).limit(1);

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const newBalance = parseFloat(account.balance) + bodyValidated.data.amount;
  const [updated] = await db.update(accountsTable)
    .set({ balance: newBalance.toString() })
    .where(eq(accountsTable.id, account.id))
    .returning();

  res.json({ ...updated, balance: parseFloat(updated.balance) });
});

router.patch("/admin/users/:id/kyc", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsValidated = UpdateKycDecisionParams.safeParse({ id: parseInt(raw, 10) });
  const bodyValidated = UpdateKycDecisionBody.safeParse(req.body);

  if (!paramsValidated.success || !bodyValidated.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const now = new Date();
  await db.update(kycTable)
    .set({
      status: bodyValidated.data.status,
      reviewedAt: now,
      rejectionReason: bodyValidated.data.rejectionReason ?? null,
    })
    .where(eq(kycTable.userId, paramsValidated.data.id));

  const [kyc] = await db.select().from(kycTable).where(eq(kycTable.userId, paramsValidated.data.id)).limit(1);
  res.json({
    status: kyc.status,
    documentType: kyc.documentType,
    submittedAt: kyc.submittedAt?.toISOString() ?? null,
    reviewedAt: kyc.reviewedAt?.toISOString() ?? null,
    rejectionReason: kyc.rejectionReason,
  });
});

router.get("/admin/deposits", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = GetAdminDepositsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(transactionsTable).$dynamic();
  if (params.data.status) {
    query = query.where(eq(transactionsTable.status, params.data.status));
  }

  const txns = await query;
  res.json(txns.map(t => ({
    ...t,
    amount: parseFloat(t.amount),
    fee: parseFloat(t.fee),
    netAmount: parseFloat(t.netAmount),
    reviewedAt: t.reviewedAt?.toISOString() ?? null,
  })));
});

router.post("/admin/deposits/:id/approve", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!txn) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const now = new Date();
  const [updated] = await db.update(transactionsTable)
    .set({ status: "approved", reviewedAt: now })
    .where(eq(transactionsTable.id, id))
    .returning();

  // Credit balance if deposit
  if (txn.type === "deposit" && txn.accountId) {
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, txn.accountId)).limit(1);
    if (account) {
      const newBalance = parseFloat(account.balance) + parseFloat(txn.netAmount);
      await db.update(accountsTable).set({ balance: newBalance.toString() }).where(eq(accountsTable.id, txn.accountId));
    }
  }

  res.json({ ...updated, amount: parseFloat(updated.amount), fee: parseFloat(updated.fee), netAmount: parseFloat(updated.netAmount), reviewedAt: updated.reviewedAt?.toISOString() ?? null });
});

router.post("/admin/deposits/:id/reject", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [updated] = await db.update(transactionsTable)
    .set({ status: "rejected", reviewedAt: new Date() })
    .where(eq(transactionsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({ ...updated, amount: parseFloat(updated.amount), fee: parseFloat(updated.fee), netAmount: parseFloat(updated.netAmount), reviewedAt: updated.reviewedAt?.toISOString() ?? null });
});

export default router;
