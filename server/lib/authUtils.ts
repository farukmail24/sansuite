import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { pool } from "../db";

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "sansuite_super_secure_jwt_secret_key_2026";
}

export function signJwt(payload: object, expiresIn: string | number = "7d") {
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export async function authMiddleware(req: Request & { user?: any }, res: Response, next: NextFunction) {
  let token: string | undefined;
  const rawAuth = req.headers["authorization"] || req.headers["x-auth-token"];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  
  if (typeof authHeader === "string" && authHeader.trim().length > 0) {
    const trimmed = authHeader.trim();
    if (trimmed.toLowerCase().startsWith("bearer ")) {
      token = trimmed.slice(7).trim();
    } else {
      token = trimmed;
    }
  } else if (req.query) {
    if (typeof req.query.token === "string" && req.query.token.trim().length > 0) {
      token = req.query.token.trim();
    } else if (typeof req.query.auth_token === "string" && req.query.auth_token.trim().length > 0) {
      token = req.query.auth_token.trim();
    } else if (typeof req.query.accessToken === "string" && req.query.accessToken.trim().length > 0) {
      token = req.query.accessToken.trim();
    }
  }

  if (!token && (req as any).cookies) {
    token = (req as any).cookies.token || (req as any).cookies.jwt || (req as any).cookies["auth-token"];
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const decoded = verifyJwt(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  req.user = decoded;

  // Enrich with latest role and permissions from DB
  if (req.user?.isPortalUser) {
    try {
      const [rows]: any = await pool.query(
        "SELECT is_active, portal_type, client_id, practice_id FROM portal_users WHERE id = ?",
        [req.user.id]
      );
      if (rows && rows.length > 0) {
        if (rows[0].is_active === 0 || rows[0].is_active === false) {
          return res.status(403).json({ message: "Portal client account is deactivated." });
        }
        req.user.portalType = rows[0].portal_type || req.user.portalType;
        req.user.clientId = rows[0].client_id || req.user.clientId;
        req.user.practiceId = rows[0].practice_id || req.user.practiceId;
        req.user.role = req.user.portalType === "sme" ? "sme_client" : "portal_client";
        req.user.permissions = null;
      } else {
        return res.status(401).json({ message: "Portal client account no longer exists." });
      }
    } catch (e) {
      // Keep existing JWT payload on momentary DB connection issue
    }
  } else if (req.user?.id) {
    try {
      const [rows]: any = await pool.query(
        "SELECT role, permissions_json, is_active, practice_id FROM users WHERE id = ?",
        [req.user.id]
      );
      if (rows && rows.length > 0) {
        if (rows[0].is_active === 0 || rows[0].is_active === false) {
          return res.status(403).json({ message: "User account is deactivated." });
        }
        if (rows[0].role) {
          req.user.role = rows[0].role;
        }
        if (rows[0].practice_id) {
          req.user.practiceId = rows[0].practice_id;
        }
        if (rows[0].permissions_json) {
          try {
            req.user.permissions = typeof rows[0].permissions_json === "string"
              ? JSON.parse(rows[0].permissions_json)
              : rows[0].permissions_json;
          } catch {
            req.user.permissions = null;
          }
        }
      }
    } catch (e) {
      // In case DB lookup fails momentarily, keep existing JWT payload
    }
  }

  next();
}

/**
 * Middleware: Denies access to portal clients and unprivileged external users.
 * Guarantees that only authentic practice staff (admin, super_accountant, accountant, staff) can access practice endpoints.
 */
export function requirePracticeUser(req: Request & { user?: any }, res: Response, next: NextFunction) {
  if (
    !req.user ||
    req.user.isPortalUser ||
    req.user.role === "portal_client" ||
    req.user.role === "sme_client" ||
    req.user.role === "client"
  ) {
    return res.status(403).json({
      error: "Access denied. Portal clients cannot access practice management resources.",
      code: "PORTAL_CLIENT_FORBIDDEN"
    });
  }
  next();
}

/**
 * Resolves client assignment restriction for current user.
 * Returns null if unrestricted (Super Accountant, Admin, autoAssign = true).
 * Returns array of client IDs (number[]) if restricted to specific clients.
 */
export function getUserAssignedClientIds(user: any): number[] | null {
  if (!user) return [];
  const role = user.role;
  if (role === "admin" || role === "super_accountant") {
    return null; // Unrestricted practice access
  }
  const perms = user.permissions;
  if (perms?.autoAssign === true) {
    return null; // Auto-assigned to all practice clients
  }
  const assigned = perms?.assignedClientIds;
  if (Array.isArray(assigned)) {
    return assigned.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0);
  }
  return []; // Restricted with no clients assigned
}

/**
 * RBAC: require one of the given roles.
 * Usage: router.delete("/...", requireRole("admin"), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const userRole: string = req.user?.role ?? "";
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: `Access denied. Required role: ${roles.join(" or ")}.` });
    }
    next();
  };
}

/**
 * RBAC: require the user to be a system admin (isSuperAdmin flag in JWT).
 */
export function requireSystemAdmin(req: Request & { user?: any }, res: Response, next: NextFunction) {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Access denied. System Admin only." });
  }
  next();
}

/**
 * Granular Permission Guard for API endpoints across SanSuite.
 * Usage: router.delete("/...", requirePermission("time_fees", "delete"), handler)
 */
export function requirePermission(
  moduleKey: string,
  action: "view" | "create" | "edit" | "delete" | "approve" = "view"
) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const role: string = req.user?.role ?? "";
    if (role === "admin" || role === "super_accountant") {
      return next();
    }

    const perms = req.user?.permissions;
    if (perms) {
      if (perms.modulePermissions && perms.modulePermissions[moduleKey] === false) {
        return res.status(403).json({
          message: `Access denied. Module '${moduleKey}' is deactivated for your account.`,
        });
      }
      if (perms.crudPermissions?.[moduleKey] && perms.crudPermissions[moduleKey]?.view === false) {
        return res.status(403).json({
          message: `Access denied. Module '${moduleKey}' is deactivated for your account.`,
        });
      }
      if (role === "auditor" && action !== "view") {
        return res.status(403).json({
          message: `Access denied. Auditor accounts have strictly read-only audit access.`,
        });
      }
      const crud = perms.crudPermissions?.[moduleKey];
      if (crud && crud[action] === false) {
        return res.status(403).json({
          message: `Access denied. You do not have '${action}' authorization on module '${moduleKey}'.`,
        });
      }
    }

    if (action === "approve" && role !== "accountant") {
      return res.status(403).json({
        message: `Access denied. Only Accountants or Super Accountants have sign-off authority.`,
      });
    }

    next();
  };
}

