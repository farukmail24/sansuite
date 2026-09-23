import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "SanSuite-dev-secret";

export function signJwt(payload: object, expiresIn: string | number = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request & { user?: any }, res: Response, next: NextFunction) {
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
  next();
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
