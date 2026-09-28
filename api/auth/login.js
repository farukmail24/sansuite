const sanitizeHost = (rawHost) => {
  if (!rawHost) return "localhost";
  return rawHost
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();
};

const JWT_SECRET = process.env.JWT_SECRET || "sansuite_super_secure_jwt_secret_key_2026";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", req.headers?.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-tenant-id");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const { email, password, portalType } = body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Dynamic resilient imports
    const mysqlMod = await import("mysql2/promise");
    const mysql = mysqlMod.default || mysqlMod;

    const bcryptMod = await import("bcryptjs");
    const bcrypt = bcryptMod.default || bcryptMod;

    const jwtMod = await import("jsonwebtoken");
    const jwt = jwtMod.default || jwtMod;

    const signJwt = (payload) => {
      return (jwt.sign || jwtMod.sign)(payload, JWT_SECRET, { expiresIn: "7d" });
    };

    const host = sanitizeHost(process.env.DB_HOST || "localhost");
    const port = parseInt(process.env.DB_PORT || "3306");
    const user = process.env.DB_USERNAME || "root";
    const pass = process.env.DB_PASSWORD || "";
    const database = process.env.DB_DATABASE || "SanSuite";

    let conn;
    try {
      conn = await mysql.createConnection({
        host,
        port,
        user,
        password: pass,
        database,
        connectTimeout: 8000,
      });
    } catch (dbErr) {
      console.error("[Auth API] Database connection error:", dbErr);
      let clientMsg = "Database connection error. ";
      if (dbErr.code === "ER_ACCESS_DENIED_ERROR" || dbErr.code === "ER_DBACCESS_DENIED_ERROR") {
        clientMsg = `Database Access Denied for user '${user}'. In cPanel -> MySQL Databases, please scroll down to 'Add User To Database', select user '${user}' and database '${database}', click 'Add', and check 'ALL PRIVILEGES'. Also ensure '%' is added in Remote MySQL.`;
      } else if (dbErr.code === "ECONNREFUSED" || dbErr.code === "ETIMEDOUT") {
        clientMsg = `Database connection timed out connecting to ${host}:${port}. Please verify DB_HOST and remote port 3306.`;
      } else {
        clientMsg += dbErr.message || String(dbErr);
      }
      return res.status(500).json({ message: clientMsg, code: dbErr.code, error: dbErr.message });
    }

    try {
      const compareHash = bcrypt.compare || bcryptMod.compare;

      // 1. If portal user (client, 365, sme)
      if (portalType && portalType !== "accountant") {
        const [pUsers] = await conn.execute(
          "SELECT * FROM portal_users WHERE email = ? AND is_active = 1 LIMIT 1",
          [email]
        );
        const pUser = pUsers[0];

        if (pUser && pUser.password_hash) {
          const valid = await compareHash(password, pUser.password_hash);
          if (valid) {
            let clientName = "Client Company";
            if (pUser.client_id) {
              const [clients] = await conn.execute(
                "SELECT client_name FROM clients WHERE id = ? LIMIT 1",
                [pUser.client_id]
              );
              if (clients[0]) clientName = clients[0].client_name;
            }

            const effectivePortalType = pUser.portal_type || portalType;
            const token = signJwt({
              id: pUser.id,
              email: pUser.email,
              firstName: pUser.first_name,
              lastName: pUser.last_name,
              role: effectivePortalType === "sme" ? "sme_client" : "portal_client",
              practiceId: pUser.practice_id,
              clientId: pUser.client_id,
              portalType: effectivePortalType,
              isPortalUser: true,
            });

            await conn.execute("UPDATE portal_users SET last_login = NOW() WHERE id = ?", [pUser.id]);
            await conn.end();

            return res.json({
              token,
              user: {
                id: pUser.id,
                email: pUser.email,
                firstName: pUser.first_name,
                lastName: pUser.last_name,
                phone: pUser.phone,
                role: effectivePortalType === "sme" ? "sme_client" : "portal_client",
                practiceId: pUser.practice_id,
                clientId: pUser.client_id,
                clientName,
                portalType: effectivePortalType,
                isPortalUser: true,
                twoFactorEnabled: !!pUser.two_factor_enabled,
              },
            });
          }
        }
      }

      // 2. Default or Accountant login: check users table
      const [users] = await conn.execute(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      const userRecord = users[0];

      if (!userRecord) {
        // Fallback: check portal_users if not found in users
        if (!portalType || portalType !== "accountant") {
          const [fallbackUsers] = await conn.execute(
            "SELECT * FROM portal_users WHERE email = ? AND is_active = 1 LIMIT 1",
            [email]
          );
          const pUser = fallbackUsers[0];
          if (pUser && pUser.password_hash) {
            const valid = await compareHash(password, pUser.password_hash);
            if (valid) {
              let clientName = "Client Company";
              if (pUser.client_id) {
                const [clients] = await conn.execute(
                  "SELECT client_name FROM clients WHERE id = ? LIMIT 1",
                  [pUser.client_id]
                );
                if (clients[0]) clientName = clients[0].client_name;
              }

              const effectivePortalType = pUser.portal_type || "365";
              const token = signJwt({
                id: pUser.id,
                email: pUser.email,
                firstName: pUser.first_name,
                lastName: pUser.last_name,
                role: effectivePortalType === "sme" ? "sme_client" : "portal_client",
                practiceId: pUser.practice_id,
                clientId: pUser.client_id,
                portalType: effectivePortalType,
                isPortalUser: true,
              });

              await conn.execute("UPDATE portal_users SET last_login = NOW() WHERE id = ?", [pUser.id]);
              await conn.end();

              return res.json({
                token,
                user: {
                  id: pUser.id,
                  email: pUser.email,
                  firstName: pUser.first_name,
                  lastName: pUser.last_name,
                  phone: pUser.phone,
                  role: effectivePortalType === "sme" ? "sme_client" : "portal_client",
                  practiceId: pUser.practice_id,
                  clientId: pUser.client_id,
                  clientName,
                  portalType: effectivePortalType,
                  isPortalUser: true,
                  twoFactorEnabled: !!pUser.two_factor_enabled,
                },
              });
            }
          }
        }
        await conn.end();
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await compareHash(password, userRecord.password_hash);
      if (!valid) {
        await conn.end();
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check 2FA
      if (userRecord.two_factor_enabled) {
        const tempToken = signJwt({ tempUserId: userRecord.id, is2faPending: true });
        await conn.end();
        return res.json({
          requires2fa: true,
          tempToken,
          email: userRecord.email,
        });
      }

      const token = signJwt({
        id: userRecord.id,
        email: userRecord.email,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        role: userRecord.role,
        portalType: "accountant",
        practiceId: userRecord.practice_id,
        isPortalUser: false,
      });

      await conn.end();

      return res.json({
        token,
        user: {
          id: userRecord.id,
          email: userRecord.email,
          firstName: userRecord.first_name,
          lastName: userRecord.last_name,
          phone: userRecord.phone,
          role: userRecord.role,
          portalType: "accountant",
          practiceId: userRecord.practice_id,
          isPortalUser: false,
          twoFactorEnabled: !!userRecord.two_factor_enabled,
        },
      });
    } catch (queryErr) {
      console.error("[Auth API] Query error:", queryErr);
      if (conn) await conn.end().catch(() => {});
      return res.status(500).json({ message: queryErr.message || "Authentication query failed" });
    }
  } catch (fatalErr) {
    console.error("[Auth API] Fatal error:", fatalErr);
    return res.status(500).json({ message: fatalErr.message || "Internal server error" });
  }
}
