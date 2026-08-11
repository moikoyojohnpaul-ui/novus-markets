import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, kycTable, sessionsTable } from "@workspace/db";
import { UpdateProfileBody, SubmitKycBody, ChangePasswordBody, Toggle2faBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { hashPassword, verifyPassword } from "../lib/crypto";

const router: IRouter = Router();

router.patch("/users/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, req.userId!)).returning();
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.get("/users/kyc", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [kyc] = await db.select().from(kycTable).where(eq(kycTable.userId, req.userId!)).limit(1);
  if (!kyc) {
    res.json({ status: "unverified", documentType: null, submittedAt: null, reviewedAt: null, rejectionReason: null });
    return;
  }
  res.json({
    status: kyc.status,
    documentType: kyc.documentType,
    submittedAt: kyc.submittedAt?.toISOString() ?? null,
    reviewedAt: kyc.reviewedAt?.toISOString() ?? null,
    rejectionReason: kyc.rejectionReason,
  });
});

router.post("/users/kyc", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SubmitKycBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(kycTable).where(eq(kycTable.userId, req.userId!)).limit(1);
  const now = new Date();
  if (existing.length > 0) {
    await db.update(kycTable).set({
      status: "pending",
      documentType: parsed.data.documentType,
      documentData: parsed.data.documentData,
      submittedAt: now,
      reviewedAt: null,
      rejectionReason: null,
    }).where(eq(kycTable.userId, req.userId!));
  } else {
    await db.insert(kycTable).values({
      userId: req.userId!,
      status: "pending",
      documentType: parsed.data.documentType,
      documentData: parsed.data.documentData,
      submittedAt: now,
    });
  }

  res.json({ status: "pending", documentType: parsed.data.documentType, submittedAt: now.toISOString(), reviewedAt: null, rejectionReason: null });
});

router.get("/users/sessions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const auth = req.headers.authorization ?? "";
  const currentToken = auth.slice(7);
  const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.userId, req.userId!));
  res.json(sessions.map(s => ({
    id: s.id,
    device: s.device,
    ipAddress: s.ipAddress,
    location: s.location,
    createdAt: s.createdAt.toISOString(),
    isCurrent: s.token === currentToken,
  })));
});

router.post("/users/change-password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }
  const isValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!isValid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }
  const newHash = await hashPassword(parsed.data.newPassword);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, req.userId!));
  res.json({ message: "Password changed successfully" });
});

router.patch("/users/2fa", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = Toggle2faBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.update(usersTable).set({ twoFaEnabled: parsed.data.enabled }).where(eq(usersTable.id, req.userId!));
  res.json({ message: `2FA ${parsed.data.enabled ? "enabled" : "disabled"}` });
});

export default router;
