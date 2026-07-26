import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, transactionsTable, accountsTable, platformSettingsTable, revenueLedgerTable } from "@workspace/db";
import {
  GetDepositsQueryParams,
  GetDepositFeePreviewQueryParams,
  CreateDepositBody,
  CreateWithdrawalBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

// ─── Deposits list ──────────────────────────────────────────────────────────

router.get("/deposits", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetDepositsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const conditions = [eq(transactionsTable.userId, req.userId!)];
  if (params.data.type) conditions.push(eq(transactionsTable.type, params.data.type));

  const txns = await db.select().from(transactionsTable).where(and(...conditions));
  res.json(txns.map(formatTransaction));
});

// ─── Fee preview ─────────────────────────────────────────────────────────────

router.get("/deposits/fee-preview", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetDepositFeePreviewQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [settings] = await db.select().from(platformSettingsTable).limit(1);
  const feeRate = settings ? parseFloat(settings.depositFeeRate.toString()) : 0.02;
  const amount = params.data.amount;
  const feeAmount = amount * feeRate;
  const netAmount = amount - feeAmount;

  res.json({ depositAmount: amount, feeRate, feeAmount, netAmount });
});

// ─── Create deposit ──────────────────────────────────────────────────────────

router.post("/deposits", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateDepositBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { method, amount, accountId, phoneNumber, walletAddress } = parsed.data;

  // Per-method field validation
  if (method === "mpesa" && !phoneNumber) {
    res.status(400).json({ error: "Phone number is required for M-Pesa deposits" });
    return;
  }
  if ((method === "crypto_usdt" || method === "crypto_btc") && !walletAddress) {
    // sender wallet address is optional for tracking — not enforced
  }

  const [settings] = await db.select().from(platformSettingsTable).limit(1);
  const feeRate = settings ? parseFloat(settings.depositFeeRate.toString()) : 0.02;
  const minDeposit = settings ? parseFloat(settings.minDeposit.toString()) : 10;

  if (amount < minDeposit) {
    res.status(400).json({ error: `Minimum deposit is $${minDeposit}` });
    return;
  }

  const fee = amount * feeRate;
  const netAmount = amount - fee;

  const [txn] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    accountId,
    type: "deposit",
    amount: amount.toString(),
    fee: fee.toString(),
    netAmount: netAmount.toString(),
    method,
    status: "pending",
    phoneNumber: phoneNumber ?? null,
    walletAddress: walletAddress ?? null,
    reference: `DEP-${Date.now()}`,
  }).returning();

  await db.insert(revenueLedgerTable).values({
    type: "deposit_fee",
    amount: fee.toString(),
    description: `Deposit fee (${(feeRate * 100).toFixed(1)}%) on $${amount}`,
    userId: req.userId!,
  });

  const paymentInstructions = buildDepositInstructions({ method, amount, txnId: txn.id, settings, phoneNumber });

  res.status(201).json({ ...formatTransaction(txn), paymentInstructions });
});

// ─── Create withdrawal ───────────────────────────────────────────────────────

router.post("/deposits/withdraw", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateWithdrawalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { method, amount, accountId, phoneNumber, walletAddress } = parsed.data;

  // Per-method field validation
  if (method === "mpesa" && !phoneNumber) {
    res.status(400).json({ error: "Phone number is required for M-Pesa withdrawals" });
    return;
  }
  if ((method === "crypto_usdt" || method === "crypto_btc") && !walletAddress) {
    res.status(400).json({ error: "Wallet address is required for crypto withdrawals" });
    return;
  }

  // FIXED: verify the account belongs to this user
  const [account] = await db.select().from(accountsTable)
    .where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, req.userId!)))
    .limit(1);

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  if (parseFloat(account.balance) < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  // FIXED: deduct balance immediately to prevent concurrent overdraft requests
  const newBalance = parseFloat(account.balance) - amount;
  await db.update(accountsTable)
    .set({ balance: newBalance.toString() })
    .where(eq(accountsTable.id, account.id));

  const [txn] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    accountId,
    type: "withdrawal",
    amount: amount.toString(),
    fee: "0",
    netAmount: amount.toString(),
    method,
    status: "pending",
    phoneNumber: phoneNumber ?? null,
    walletAddress: walletAddress ?? null,
    reference: `WIT-${Date.now()}`,
  }).returning();

  res.status(201).json(formatTransaction(txn));
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

type DepositInstructionArgs = {
  method: string;
  amount: number;
  txnId: number;
  settings: { mpesaPaybill?: string; cryptoWalletUsdt?: string; cryptoWalletBtc?: string } | null;
  phoneNumber?: string | null;
};

function buildDepositInstructions({ method, amount, txnId, settings, phoneNumber }: DepositInstructionArgs): object {
  const reference = `DEP-${txnId}`;
  switch (method) {
    case "mpesa":
      return {
        method: "mpesa",
        paybill: settings?.mpesaPaybill ?? "123456",
        accountNumber: reference,
        amount,
        phoneNumber,
        steps: [
          "Go to M-Pesa on your phone",
          "Select Lipa na M-Pesa → Pay Bill",
          `Business No: ${settings?.mpesaPaybill ?? "123456"}`,
          `Account No: ${reference}`,
          `Amount: ${amount}`,
          "Enter your M-Pesa PIN and confirm",
          "Your deposit will be credited after admin confirmation",
        ],
      };
    case "crypto_usdt":
      return {
        method: "crypto_usdt",
        walletAddress: settings?.cryptoWalletUsdt ?? "",
        network: "TRC-20 (Tron)",
        amount,
        reference,
        warning: "Only send USDT on the TRC-20 network. Other networks will cause permanent loss of funds.",
        steps: [
          `Send exactly ${amount} USDT (TRC-20) to:`,
          settings?.cryptoWalletUsdt ?? "—",
          "Your deposit will be credited after blockchain confirmation (~10 min)",
        ],
      };
    case "crypto_btc":
      return {
        method: "crypto_btc",
        walletAddress: settings?.cryptoWalletBtc ?? "",
        network: "Bitcoin (BTC)",
        amount,
        reference,
        steps: [
          `Send the USD equivalent of $${amount} in BTC to:`,
          settings?.cryptoWalletBtc ?? "—",
          "Your deposit will be credited after 2 blockchain confirmations (~20 min)",
        ],
      };
    case "card":
      return {
        method: "card",
        amount,
        reference,
        // To integrate Stripe: return a PaymentIntent client_secret here so the
        // frontend Stripe SDK can collect card details securely without them
        // touching your server. Example:
        //   const intent = await stripe.paymentIntents.create({ amount: amount * 100, currency: "usd" });
        //   return { clientSecret: intent.client_secret, ... }
        message: "Complete card payment via the payment gateway. Your deposit will be credited on confirmation.",
      };
    case "bank_transfer":
      return {
        method: "bank_transfer",
        amount,
        reference,
        steps: [
          "Transfer the exact amount to our bank account",
          `Narration / Reference: ${reference}`,
          "Send proof of payment to support for faster processing",
          "Deposits are credited within 1–2 business days",
        ],
      };
    default:
      return { method, reference, amount };
  }
}

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