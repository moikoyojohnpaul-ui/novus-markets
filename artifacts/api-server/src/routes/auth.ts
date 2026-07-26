import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable, accountsTable, kycTable, platformSettingsTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import crypto from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "nm_salt_2024").digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, firstName, lastName, phone } = parsed.data;

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash: hashPassword(password),
    firstName,
    lastName,
    phone: phone ?? null,
  }).returning();

  // Create real account (no unused variable)
  await db.insert(accountsTable).values({
    userId: user.id,
    type: "real",
    balance: "0",
    currency: "USD",
    leverage: 100,
  });

  const [platformSettings] = await db.select().from(platformSettingsTable).limit(1);
  const demoBalance = platformSettings?.demoBalance ?? "10000";

  await db.insert(accountsTable).values({
    userId: user.id,
    type: "demo",
    balance: demoBalance.toString(),
    currency: "USD",
    leverage: 100,
  });

  await db.insert(kycTable).values({ userId: user.id, status: "unverified" });

  const token = generateToken();
  await db.insert(sessionsTable).values({
    userId: user.id,
    token,
    device: req.headers["user-agent"] ?? "Unknown",
    ipAddress: req.ip ?? "0.0.0.0",
  });

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ user: safeUser, token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = generateToken();
  await db.insert(sessionsTable).values({
    userId: user.id,
    token,
    device: req.headers["user-agent"] ?? "Unknown",
    ipAddress: req.ip ?? "0.0.0.0",
  });

  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

router.post("/auth/logout", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const auth = req.headers.authorization ?? "";
  const token = auth.slice(7);
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

export default router;