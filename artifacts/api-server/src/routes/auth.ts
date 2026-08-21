import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable, accountsTable, kycTable, platformSettingsTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "../lib/crypto";

const router: IRouter = Router();

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 requests per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

function setAuthCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });
}

router.post("/auth/register", authLimiter, async (req, res): Promise<void> => {
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

  const hashedPassword = await hashPassword(password);

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  let safeUser: any = null;

  try {
    await db.transaction(async (tx) => {
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");

      const [user] = await tx.insert(usersTable).values({
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        phone: phone ?? null,
        emailVerificationToken,
      }).returning();

      await tx.insert(accountsTable).values({
        userId: user.id,
        type: "real",
        balance: "0",
        currency: "USD",
        leverage: 100,
      });

      const [platformSettings] = await tx.select().from(platformSettingsTable).limit(1);
      const demoBalance = platformSettings?.demoBalance ?? "10000";

      await tx.insert(accountsTable).values({
        userId: user.id,
        type: "demo",
        balance: demoBalance.toString(),
        currency: "USD",
        leverage: 100,
      });

      await tx.insert(kycTable).values({ userId: user.id, status: "unverified" });

      await tx.insert(sessionsTable).values({
        userId: user.id,
        token,
        device: req.headers["user-agent"] ?? "Unknown",
        ipAddress: req.ip ?? "0.0.0.0",
        expiresAt,
      });

      const { passwordHash: _, ...withoutHash } = user;
      safeUser = withoutHash;
    });

    setAuthCookie(res, token, expiresAt);
    res.status(201).json({ user: safeUser, token });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({
      error: "Failed to register user",
      details: error?.message ?? String(error),
    });
  }
});
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(sessionsTable).values({
    userId: user.id,
    token,
    device: req.headers["user-agent"] ?? "Unknown",
    ipAddress: req.ip ?? "0.0.0.0",
    expiresAt,
  });

  const { passwordHash: _, ...safeUser } = user;
  setAuthCookie(res, token, expiresAt);
  res.json({ user: safeUser, token });
});

router.post("/auth/logout", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const auth = req.headers.authorization ?? "";
  const cookieToken = req.cookies?.token;
  const token = cookieToken || auth.slice(7);
  
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  
  res.clearCookie("token");
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