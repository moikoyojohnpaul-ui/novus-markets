import { pgTable, serial, timestamp, numeric, integer, text, pgEnum, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const accountTypeEnum = pgEnum("account_type", ["real", "demo"]);

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: accountTypeEnum("type").notNull().default("real"),
  balance: numeric("balance", { precision: 18, scale: 8 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  leverage: integer("leverage").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => {
  return [
    index("account_user_idx").on(table.userId),
    check("balance_positive", sql`${table.balance} >= 0`)
  ];
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
