import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, transactionsTable, accountsTable, platformSettingsTable, revenueLedgerTable } from "@workspace/db";
import {
  GetDepositsQueryParams,
  GetDepositFeePreviewQueryParams,
  CreateDepositBody,
  CreateWithdrawalBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/deposits", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetDepositsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, req.userId!))
    .$dynamic();

  if (params.data.type) {
    query = query.where(eq(transactionsTable.type, params.data.type));
  }

  const txns = await query;
  res.json(txns.map(formatTransaction));
});

router.get("/deposits/fee-preview", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetDepositFeePreviewQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [settings] = await db.select().from(platformSettingsTable).limit(1);
  const feeRate = settings ? parseFloat(settings.depositFeeRate.toString()) : 0.02;
  const amount = params.data.amount;
  const feeAmount = amount * feeRate;
  const netAmount = amount - feeAmount;

  res.json({ depositAmount: amount, feeRate, feeAmount, netAmount });
});

router.post("/deposits", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateDepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [settings] = await db.select().from(platformSettingsTable).limit(1);
  const feeRate = settings ? parseFloat(settings.depositFeeRate.toString()) : 0.02;
  const fee = parsed.data.amount * feeRate;
  const netAmount = parsed.data.amount - fee;

  const [txn] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    accountId: parsed.data.accountId,
    type: "deposit",
    amount: parsed.data.amount.toString(),
    fee: fee.toString(),
    netAmount: netAmount.toString(),
    method: parsed.data.method,
    status: "pending",
    phoneNumber: parsed.data.phoneNumber,
    walletAddress: parsed.data.walletAddress,
    reference: `DEP-${Date.now()}`,
  }).returning();

  // Log fee to revenue ledger
  await db.insert(revenueLedgerTable).values({
    type: "deposit_fee",
    amount: fee.toString(),
    description: `Deposit fee (${(feeRate * 100).toFixed(1)}%) on $${parsed.data.amount}`,
    userId: req.userId!,
  });

  res.status(201).json(formatTransaction(txn));
});

router.post("/deposits/withdraw", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [account] = await db.select().from(accountsTable)
    .where(eq(accountsTable.id, parsed.data.accountId)).limit(1);

  if (!account || parseFloat(account.balance) < parsed.data.amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const [txn] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    accountId: parsed.data.accountId,
    type: "withdrawal",
    amount: parsed.data.amount.toString(),
    fee: "0",
    netAmount: parsed.data.amount.toString(),
    method: parsed.data.method,
    status: "pending",
    phoneNumber: parsed.data.phoneNumber,
    walletAddress: parsed.data.walletAddress,
    reference: `WIT-${Date.now()}`,
  }).returning();

  res.status(201).json(formatTransaction(txn));
});

function formatTransaction(t: typeof transactionsTable.$inferSelect) {
  return {
    ...t,
    amount: parseFloat(t.amount),
    fee: parseFloat(t.fee),
    netAmount: parseFloat(t.netAmount),
    reviewedAt: t.reviewedAt?.toISOString() ?? null,
  };
}

export default router;
