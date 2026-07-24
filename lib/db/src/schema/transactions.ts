import { pgTable, serial, text, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { accountsTable } from "./accounts";

export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "withdrawal"]);
export const transactionMethodEnum = pgEnum("transaction_method", ["mpesa", "crypto_usdt", "crypto_btc", "card", "bank_transfer"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "approved", "rejected", "completed"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  accountId: integer("account_id").references(() => accountsTable.id),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  fee: numeric("fee", { precision: 18, scale: 8 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 18, scale: 8 }).notNull(),
  method: transactionMethodEnum("method").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  reference: text("reference"),
  walletAddress: text("wallet_address"),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
