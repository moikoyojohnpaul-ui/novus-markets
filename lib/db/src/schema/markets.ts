import { pgTable, serial, text, numeric, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketCategoryEnum = pgEnum("market_category", ["forex", "crypto", "indices", "commodities"]);

export const marketsTable = pgTable("markets", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  category: marketCategoryEnum("category").notNull(),
  bidPrice: numeric("bid_price", { precision: 18, scale: 8 }).notNull().default("0"),
  askPrice: numeric("ask_price", { precision: 18, scale: 8 }).notNull().default("0"),
  spread: numeric("spread", { precision: 10, scale: 5 }).notNull().default("0"),
  change24h: numeric("change_24h", { precision: 10, scale: 4 }).notNull().default("0"),
  volume24h: numeric("volume_24h", { precision: 24, scale: 4 }).notNull().default("0"),
  high24h: numeric("high_24h", { precision: 18, scale: 8 }).notNull().default("0"),
  low24h: numeric("low_24h", { precision: 18, scale: 8 }).notNull().default("0"),
  pipSize: numeric("pip_size", { precision: 10, scale: 8 }).notNull().default("0.0001"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketSchema = createInsertSchema(marketsTable).omit({ id: true, updatedAt: true });
export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type Market = typeof marketsTable.$inferSelect;
