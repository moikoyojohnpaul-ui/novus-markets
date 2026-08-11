import { type Request, type Response, type NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const [result] = await db
    .select({
      userId: sessionsTable.userId,
      expiresAt: sessionsTable.expiresAt,
      role: usersTable.role
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.token, token))
    .limit(1);

  if (!result || new Date() > result.expiresAt) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.userId = result.userId;
  req.userRole = result.role;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  }).catch(next);
}
