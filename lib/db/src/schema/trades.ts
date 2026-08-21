import { pgTable, serial, text, numeric, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";

export const tradeSideEnum = pgEnum("trade_side", ["buy", "sell"]);
export const tradeTypeEnum = pgEnum("trade_type", ["market", "limit", "stop"]);
export const tradeStatusEnum = pgEnum("trade_status", ["open", "pending", "closed", "cancelled"]);

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accountsTable.id),
  symbol: text("symbol").notNull(),
  side: tradeSideEnum("side").notNull(),
  type: tradeTypeEnum("type").notNull(),
  lotSize: numeric("lot_size", { precision: 10, scale: 4 }).notNull(),
  openPrice: numeric("open_price", { precision: 18, scale: 8 }).notNull(),
  closePrice: numeric("close_price", { precision: 18, scale: 8 }),
  stopLoss: numeric("stop_loss", { precision: 18, scale: 8 }),
  takeProfit: numeric("take_profit", { precision: 18, scale: 8 }),
  leverage: integer("leverage").notNull().default(100),
  margin: numeric("margin", { precision: 18, scale: 8 }).notNull().default("0"),
  pnl: numeric("pnl", { precision: 18, scale: 8 }),
  fee: numeric("fee", { precision: 18, scale: 8 }).notNull().default("0"),
  status: tradeStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
}, (table) => {
  return [
    index("trade_account_idx").on(table.accountId),
    index("trade_symbol_idx").on(table.symbol),
    index("trade_status_idx").on(table.status),
    index("trade_created_at_idx").on(table.createdAt)
  ];
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, createdAt: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
