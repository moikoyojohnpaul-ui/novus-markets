CREATE TYPE "public"."kyc_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_theme" AS ENUM('dark', 'light');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('real', 'demo');--> statement-breakpoint
CREATE TYPE "public"."market_category" AS ENUM('forex', 'crypto', 'indices', 'commodities');--> statement-breakpoint
CREATE TYPE "public"."trade_side" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."trade_status" AS ENUM('open', 'pending', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."trade_type" AS ENUM('market', 'limit', 'stop');--> statement-breakpoint
CREATE TYPE "public"."transaction_method" AS ENUM('mpesa', 'crypto_usdt', 'crypto_btc', 'card', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('deposit', 'withdrawal');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('trade', 'deposit', 'kyc', 'system', 'alert');--> statement-breakpoint
CREATE TYPE "public"."revenue_type" AS ENUM('deposit_fee', 'spread');--> statement-breakpoint
CREATE TABLE "kyc" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" "kyc_status" DEFAULT 'unverified' NOT NULL,
	"document_type" text,
	"document_data" text,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"device" text DEFAULT 'Unknown Device' NOT NULL,
	"ip_address" text DEFAULT '0.0.0.0' NOT NULL,
	"location" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"preferred_currency" text DEFAULT 'USD' NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"two_fa_enabled" boolean DEFAULT false NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"theme" "user_theme" DEFAULT 'dark' NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "account_type" DEFAULT 'real' NOT NULL,
	"balance" numeric(18, 8) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"leverage" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "balance_positive" CHECK ("accounts"."balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"category" "market_category" NOT NULL,
	"bid_price" numeric(18, 8) DEFAULT '0' NOT NULL,
	"ask_price" numeric(18, 8) DEFAULT '0' NOT NULL,
	"spread" numeric(10, 5) DEFAULT '0' NOT NULL,
	"change_24h" numeric(10, 4) DEFAULT '0' NOT NULL,
	"volume_24h" numeric(24, 4) DEFAULT '0' NOT NULL,
	"high_24h" numeric(18, 8) DEFAULT '0' NOT NULL,
	"low_24h" numeric(18, 8) DEFAULT '0' NOT NULL,
	"pip_size" numeric(10, 8) DEFAULT '0.0001' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "markets_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"side" "trade_side" NOT NULL,
	"type" "trade_type" NOT NULL,
	"lot_size" numeric(10, 4) NOT NULL,
	"open_price" numeric(18, 8) NOT NULL,
	"close_price" numeric(18, 8),
	"stop_loss" numeric(18, 8),
	"take_profit" numeric(18, 8),
	"leverage" integer DEFAULT 100 NOT NULL,
	"margin" numeric(18, 8) DEFAULT '0' NOT NULL,
	"pnl" numeric(18, 8),
	"fee" numeric(18, 8) DEFAULT '0' NOT NULL,
	"status" "trade_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"fee" numeric(18, 8) DEFAULT '0' NOT NULL,
	"net_amount" numeric(18, 8) NOT NULL,
	"method" "transaction_method" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"reference" text,
	"wallet_address" text,
	"phone_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'system' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"deposit_fee_rate" numeric(6, 4) DEFAULT '0.02' NOT NULL,
	"spread_markup" numeric(6, 4) DEFAULT '0.0002' NOT NULL,
	"min_deposit" numeric(10, 2) DEFAULT '10' NOT NULL,
	"max_leverage" integer DEFAULT 500 NOT NULL,
	"demo_balance" numeric(14, 2) DEFAULT '10000' NOT NULL,
	"crypto_wallet_usdt" text DEFAULT 'TRX7aBcDeFgHiJkLmNoPqRsTuVwXyZ123456' NOT NULL,
	"crypto_wallet_btc" text DEFAULT 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' NOT NULL,
	"mpesa_paybill" text DEFAULT '123456' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "revenue_type" NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"description" text NOT NULL,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kyc" ADD CONSTRAINT "kyc_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_ledger" ADD CONSTRAINT "revenue_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kyc_user_idx" ON "kyc" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trade_account_idx" ON "trades" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "trade_symbol_idx" ON "trades" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "trade_status_idx" ON "trades" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trade_created_at_idx" ON "trades" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tx_user_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tx_status_idx" ON "transactions" USING btree ("status");