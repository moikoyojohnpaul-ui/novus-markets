import { pgTable, serial, text, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  depositFeeRate: numeric("deposit_fee_rate", { precision: 6, scale: 4 }).notNull().default("0.02"),
  spreadMarkup: numeric("spread_markup", { precision: 6, scale: 4 }).notNull().default("0.0002"),
  minDeposit: numeric("min_deposit", { precision: 10, scale: 2 }).notNull().default("10"),
  maxLeverage: integer("max_leverage").notNull().default(500),
  demoBalance: numeric("demo_balance", { precision: 14, scale: 2 }).notNull().default("10000"),
  cryptoWalletUsdt: text("crypto_wallet_usdt").notNull().default("TRX7aBcDeFgHiJkLmNoPqRsTuVwXyZ123456"),
  cryptoWalletBtc: text("crypto_wallet_btc").notNull().default("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"),
  mpesaPaybill: text("mpesa_paybill").notNull().default("123456"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PlatformSettings = typeof platformSettingsTable.$inferSelect;

export const revenueLedgerTypeEnum = pgEnum("revenue_type", ["deposit_fee", "spread"]);

export const revenueLedgerTable = pgTable("revenue_ledger", {
  id: serial("id").primaryKey(),
  type: revenueLedgerTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  description: text("description").notNull(),
  userId: integer("user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRevenueLedgerSchema = createInsertSchema(revenueLedgerTable).omit({ id: true, createdAt: true });
export type InsertRevenueLedger = z.infer<typeof insertRevenueLedgerSchema>;
export type RevenueLedger = typeof revenueLedgerTable.$inferSelect;
