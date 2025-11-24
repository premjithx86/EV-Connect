import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import type { User } from "@shared/schema";
import type { IStorage } from "./storage";

// Require SESSION_SECRET in production
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

const JWT_SECRET = process.env.SESSION_SECRET || "dev-secret-only-for-local-development";
const TOKEN_EXPIRY = "7d";

export interface AuthRequest extends Request {
  user?: User;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export function createAuthenticateToken(storage: IStorage) {
  return async function authenticateToken(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    console.log("[Auth] ===== Authentication Check =====");
    console.log("[Auth] URL:", req.url);
    console.log("[Auth] Method:", req.method);
    console.log("[Auth] Session ID:", req.sessionID);
    console.log("[Auth] Session userId:", req.session.userId);
    console.log("[Auth] Cookies:", req.cookies);
    console.log("[Auth] Headers cookie:", req.headers.cookie);
    
    const userId = req.session.userId;

    if (!userId) {
      console.log("[Auth] ❌ No userId in session - returning 401");
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    console.log("[Auth] 🔍 Looking up user with ID:", userId);
    
    try {
      const user = await storage.getUser(userId);
      console.log("[Auth] User lookup result:", user ? `✅ Found: ${user.email} (ID: ${user.id})` : "❌ Not found");
      
      if (!user) {
        console.log("[Auth] ❌ User not found in database - returning 401");
        res.status(401).json({ error: "User not found" });
        return;
      }

      if (user.status !== "ACTIVE") {
        console.log("[Auth] ❌ User account not active - returning 403");
        res.status(403).json({ error: "Account is not active" });
        return;
      }

      console.log("[Auth] ✅ Authentication successful for:", user.email);
      req.user = user;
      next();
    } catch (error) {
      console.error("[Auth] ❌ Error during user lookup:", error);
      res.status(500).json({ error: "Authentication error" });
    }
  };
}

export function createEnsureNotBlocked(storage: IStorage) {
  return function ensureNotBlocked(
    getTargetUserId: (req: AuthRequest) => string | undefined | Promise<string | undefined>
  ) {
    return async function ensureNotBlockedMiddleware(
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      if (!req.user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      try {
        const targetUserId = await getTargetUserId(req);

        if (!targetUserId) {
          res.status(400).json({ error: "Target user is required" });
          return;
        }

        if (targetUserId === req.user.id) {
          next();
          return;
        }

        const [blockedByRequester, blockedByTarget] = await Promise.all([
          storage.isBlocked(req.user.id, targetUserId),
          storage.isBlocked(targetUserId, req.user.id),
        ]);

        if (blockedByRequester) {
          res.status(403).json({ error: "Unblock this user to continue" });
          return;
        }

        if (blockedByTarget) {
          res.status(403).json({ error: "You are blocked by this user" });
          return;
        }

        next();
      } catch (error) {
        console.error("[Auth] Error checking block status:", error);
        res.status(500).json({ error: "Unable to verify block status" });
      }
    };
  };
}

export function requireRole(...roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}

export const requireModerator = requireRole("MODERATOR", "ADMIN");
export const requireAdmin = requireRole("ADMIN");
