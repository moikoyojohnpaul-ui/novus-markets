import { pgTable, text, serial, integer, timestamp, boolean, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("user_role", ["user", "admin"]);
export const themeEnum = pgEnum("user_theme", ["dark", "light"]);
export const kycStatusEnum = pgEnum("kyc_status", ["unverified", "pending", "verified", "rejected"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  preferredCurrency: text("preferred_currency").notNull().default("USD"),
  role: roleEnum("role").notNull().default("user"),
  twoFaEnabled: boolean("two_fa_enabled").notNull().default(false),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  theme: themeEnum("theme").notNull().default("dark"),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => {
  return [
    index("email_idx").on(table.email)
  ];
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const kycTable = pgTable("kyc", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id), // was: serial
  status: kycStatusEnum("status").notNull().default("unverified"),
  documentType: text("document_type"),
  documentData: text("document_data"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => {
  return [
    index("kyc_user_idx").on(table.userId)
  ];
});

export type KycRecord = typeof kycTable.$inferSelect;

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id), // was: serial
  token: text("token").notNull().unique(),
  device: text("device").notNull().default("Unknown Device"),
  ipAddress: text("ip_address").notNull().default("0.0.0.0"),
  location: text("location"),
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => {
  return [
    index("session_user_idx").on(table.userId),
    index("session_token_idx").on(table.token)
  ];
});

export type Session = typeof sessionsTable.$inferSelect;