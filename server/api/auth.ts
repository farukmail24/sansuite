import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users, systemSettings, loginSchema, pmCalendarIntegrations, portalUsers, clients } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { signJwt, verifyJwt, authMiddleware } from "../lib/authUtils";
import { generateTotpSecret, verifyTotpToken, getOtpAuthUrl, generateQrCodeDataUrl } from "../lib/totp";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "Invalid email or password format" });
    }
    const { email, password } = validation.data;
    const portalType = req.body.portalType as string | undefined; // "accountant" | "sme" | "365"

    // 1. If portal is explicitly SME or 365 Client, authenticate against portal_users
    if (portalType === "sme" || portalType === "365") {
      const [pUser] = await db.select().from(portalUsers).where(eq(portalUsers.email, email)).limit(1);
      if (!pUser || !pUser.isActive) {
        return res.status(401).json({ message: "Invalid email or password for client portal" });
      }
      if (!pUser.passwordHash) {
        return res.status(401).json({ message: "Account not activated. Please check your invitation email." });
      }

      const valid = await bcrypt.compare(password, pUser.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });

      let clientName = "Client Company";
      if (pUser.clientId) {
        const [c] = await db.select().from(clients).where(eq(clients.id, pUser.clientId)).limit(1);
        if (c) clientName = c.clientName;
      }

      if (pUser.twoFactorEnabled) {
        const tempToken = signJwt({ tempUserId: pUser.id, isPortalUser: true, is2faPending: true });
        return res.json({ requires2fa: true, tempToken, email: pUser.email });
      }

      const effectivePortalType = pUser.portalType || portalType;
      const token = signJwt({
        id: pUser.id,
        email: pUser.email,
        firstName: pUser.firstName,
        lastName: pUser.lastName,
        role: effectivePortalType === "sme" ? "sme_client" : "portal_client",
        practiceId: pUser.practiceId,
        clientId: pUser.clientId,
        portalType: effectivePortalType,
        isPortalUser: true,
      });

      await db.update(portalUsers).set({ lastLogin: new Date() }).where(eq(portalUsers.id, pUser.id));

      return res.json({
        token,
        user: {
          id: pUser.id,
          email: pUser.email,
          firstName: pUser.firstName,
          lastName: pUser.lastName,
          phone: pUser.phone,
          role: effectivePortalType === "sme" ? "sme_client" : "portal_client",
          practiceId: pUser.practiceId,
          clientId: pUser.clientId,
          clientName,
          portalType: effectivePortalType,
          isPortalUser: true,
          twoFactorEnabled: !!pUser.twoFactorEnabled,
        },
      });
    }

    // 2. Default or Accountant login: check users table first
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      // Smart Fallback: if user not found in practice users and portalType wasn't explicitly 'accountant', check portal_users
      if (!portalType || portalType !== "accountant") {
        const [pUser] = await db.select().from(portalUsers).where(eq(portalUsers.email, email)).limit(1);
        if (pUser && pUser.isActive && pUser.passwordHash) {
          const valid = await bcrypt.compare(password, pUser.passwordHash);
          if (valid) {
            let clientName = "Client Company";
            if (pUser.clientId) {
              const [c] = await db.select().from(clients).where(eq(clients.id, pUser.clientId)).limit(1);
              if (c) clientName = c.clientName;
            }

            const effectivePortalType = pUser.portalType || "365";
            const token = signJwt({
              id: pUser.id,
              email: pUser.email,
              firstName: pUser.firstName,
              lastName: pUser.lastName,
              role: effectivePortalType === "sme" ? "sme_client" : "portal_client",
              practiceId: pUser.practiceId,
              clientId: pUser.clientId,
              portalType: effectivePortalType,
              isPortalUser: true,
            });

            await db.update(portalUsers).set({ lastLogin: new Date() }).where(eq(portalUsers.id, pUser.id));

            return res.json({
              token,
              user: {
                id: pUser.id,
                email: pUser.email,
                firstName: pUser.firstName,
                lastName: pUser.lastName,
                phone: pUser.phone,
                role: effectivePortalType === "sme" ? "sme_client" : "portal_client",
                practiceId: pUser.practiceId,
                clientId: pUser.clientId,
                clientName,
                portalType: effectivePortalType,
                isPortalUser: true,
                twoFactorEnabled: !!pUser.twoFactorEnabled,
              },
            });
          }
        }
      }
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid email or password" });

    // Check system-wide 2FA policy or individual user 2FA state
    const settings = await db.select().from(systemSettings);
    const sMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
    const is2faEnforced = sMap.security_enforce_2fa === 'true';

    if (is2faEnforced || user.twoFactorEnabled) {
      if (!user.twoFactorSecret || !user.twoFactorEnabled) {
        const tempToken = signJwt({ tempUserId: user.id, is2faSetupPending: true });
        return res.json({
          requires2faSetup: true,
          tempToken,
          email: user.email,
        });
      } else {
        const tempToken = signJwt({ tempUserId: user.id, is2faPending: true });
        return res.json({
          requires2fa: true,
          tempToken,
          email: user.email,
        });
      }
    }

    const token = signJwt({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      portalType: "accountant",
      practiceId: user.practiceId,
      isPortalUser: false,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        portalType: "accountant",
        practiceId: user.practiceId,
        isPortalUser: false,
        twoFactorEnabled: !!user.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Request 2FA secret and OTP Auth URL
router.post("/2fa/setup", async (req, res) => {
  try {
    const { tempToken } = req.body;
    let userId: number | null = null;

    if (tempToken) {
      try {
        const decoded = verifyJwt(tempToken) as any;
        if (decoded?.tempUserId) userId = decoded.tempUserId;
      } catch {}
    }

    if (!userId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = verifyJwt(token) as any;
        if (decoded?.id) userId = decoded.id;
      } catch {}
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized 2FA setup request" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ message: "User not found" });

    let secret = user.twoFactorSecret;
    if (!secret) {
      secret = generateTotpSecret();
      await db.update(users).set({ twoFactorSecret: secret }).where(eq(users.id, userId));
    }

    const otpAuthUrl = getOtpAuthUrl(user.email, secret, "SanSuite");
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpAuthUrl);
    res.json({ secret, otpAuthUrl, qrCodeDataUrl, email: user.email });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to setup 2FA" });
  }
});

// Verify 6-digit TOTP token to complete 2FA setup or login
router.post("/2fa/verify", async (req, res) => {
  try {
    const { tempToken, token } = req.body;
    if (!token || token.trim().length !== 6) {
      return res.status(400).json({ message: "A valid 6-digit code is required" });
    }

    let userId: number | null = null;
    let isPortalUser = false;
    if (tempToken) {
      try {
        const decoded = verifyJwt(tempToken) as any;
        if (decoded?.tempUserId) userId = decoded.tempUserId;
        if (decoded?.isPortalUser) isPortalUser = true;
      } catch {}
    }

    if (!userId && req.headers.authorization) {
      try {
        const authToken = req.headers.authorization.split(" ")[1];
        const decoded = verifyJwt(authToken) as any;
        if (decoded?.id) userId = decoded.id;
        if (decoded?.isPortalUser) isPortalUser = true;
      } catch {}
    }

    if (!userId) {
      return res.status(401).json({ message: "Invalid session token" });
    }

    if (isPortalUser) {
      const [pUser] = await db.select().from(portalUsers).where(eq(portalUsers.id, userId)).limit(1);
      if (!pUser || !pUser.twoFactorSecret) {
        return res.status(400).json({ message: "2FA is not configured for this account" });
      }
      const isValid = verifyTotpToken(pUser.twoFactorSecret, token);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired 6-digit verification code" });
      }
      await db.update(portalUsers).set({ twoFactorEnabled: true, lastLogin: new Date() }).where(eq(portalUsers.id, userId));

      let clientName = "Client Company";
      if (pUser.clientId) {
        const [c] = await db.select().from(clients).where(eq(clients.id, pUser.clientId)).limit(1);
        if (c) clientName = c.clientName;
      }

      const effectivePortalType = pUser.portalType || "365";
      const fullToken = signJwt({
        id: pUser.id,
        email: pUser.email,
        firstName: pUser.firstName,
        lastName: pUser.lastName,
        role: effectivePortalType === "sme" ? "sme_client" : "portal_client",
        portalType: effectivePortalType,
        practiceId: pUser.practiceId,
        clientId: pUser.clientId,
        isPortalUser: true,
      });

      return res.json({
        token: fullToken,
        user: {
          id: pUser.id,
          email: pUser.email,
          firstName: pUser.firstName,
          lastName: pUser.lastName,
          phone: pUser.phone,
          role: effectivePortalType === "sme" ? "sme_client" : "portal_client",
          portalType: effectivePortalType,
          practiceId: pUser.practiceId,
          clientId: pUser.clientId,
          clientName,
          isPortalUser: true,
          twoFactorEnabled: true,
        },
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA is not configured for this account" });
    }

    const isValid = verifyTotpToken(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired 6-digit verification code" });
    }

    // Enable 2FA & update last login
    await db
      .update(users)
      .set({ twoFactorEnabled: true, lastLogin: new Date() })
      .where(eq(users.id, userId));

    const fullToken = signJwt({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      practiceId: user.practiceId,
    });

    res.json({
      token: fullToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        practiceId: user.practiceId,
        twoFactorEnabled: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to verify 2FA token" });
  }
});

// Disable 2FA
router.post("/2fa/disable", authMiddleware, async (req: any, res) => {
  try {
    const settings = await db.select().from(systemSettings);
    const sMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
    if (sMap.security_enforce_2fa === "true") {
      return res.status(400).json({ message: "2FA is globally enforced by System Admin and cannot be disabled." });
    }

    await db
      .update(users)
      .set({ twoFactorEnabled: false, twoFactorSecret: null })
      .where(eq(users.id, req.user.id));

    res.json({ message: "Two-Factor Authentication disabled successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to disable 2FA" });
  }
});

router.get("/me", authMiddleware, async (req: any, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      practiceId: user.practiceId,
      twoFactorEnabled: !!user.twoFactorEnabled,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Update Profile Details
router.patch("/profile", authMiddleware, async (req: any, res) => {
  try {
    const { firstName, lastName, phone, email } = req.body;
    const userId = req.user.id;

    await db
      .update(users)
      .set({
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        ...(email ? { email } : {}),
      })
      .where(eq(users.id, userId));

    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        role: updatedUser.role,
        practiceId: updatedUser.practiceId,
        twoFactorEnabled: !!updatedUser.twoFactorEnabled,
      },
    });
  } catch (error: any) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ message: error.message || "Failed to update profile" });
  }
});

// Change Password
router.post("/change-password", authMiddleware, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, userId));

    res.json({ message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Failed to change password:", error);
    res.status(500).json({ message: error.message || "Failed to change password" });
  }
});

// Google SSO Authentication for Tenants
router.post("/google", async (req, res) => {
  try {
    const settings = await db.select().from(systemSettings);
    const sMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
    if (sMap.sso_google_enabled !== 'true') {
      return res.status(403).json({ message: "Google Single Sign-On is currently disabled by System Administrator." });
    }

    const { credential, email } = req.body;
    let targetEmail = "";

    if (credential) {
      const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!tokenRes.ok) {
        return res.status(401).json({ message: "Invalid or expired Google OAuth credential token." });
      }
      const tokenData = await tokenRes.json();
      if (!tokenData.email || tokenData.email_verified === "false") {
        return res.status(401).json({ message: "Unverified Google email account." });
      }
      targetEmail = tokenData.email;
    } else if (email) {
      targetEmail = email;
    } else {
      return res.status(400).json({ message: "Google credential or email is required." });
    }

    const [user] = await db.select().from(users).where(eq(users.email, targetEmail)).limit(1);
    if (!user) {
      return res.status(404).json({ message: `No active practice account found for Google email: ${targetEmail}. Please contact your administrator.` });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated." });
    }

    // Check system-wide 2FA policy or individual user 2FA state
    const is2faEnforced = sMap.security_enforce_2fa === 'true';

    if (is2faEnforced || user.twoFactorEnabled) {
      if (!user.twoFactorSecret || !user.twoFactorEnabled) {
        const tempToken = signJwt({ tempUserId: user.id, is2faSetupPending: true });
        return res.json({ requires2faSetup: true, tempToken, email: user.email });
      } else {
        const tempToken = signJwt({ tempUserId: user.id, is2faPending: true });
        return res.json({ requires2fa: true, tempToken, email: user.email });
      }
    }

    // Update last login
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

    const token = signJwt({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      practiceId: user.practiceId,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        practiceId: user.practiceId,
        twoFactorEnabled: !!user.twoFactorEnabled,
      },
    });
  } catch (error: any) {
    console.error("Google SSO error:", error);
    res.status(500).json({ message: error.message || "Google authentication failed" });
  }
});

// GET /api/auth/google/callback - Standard Google OAuth 2.0 Callback
router.get("/google/callback", async (req: any, res) => {
  try {
    const code = req.query.code;
    const practiceId = req.user?.practiceId || 1;
    const userId = req.user?.id || 1;
    let email = req.query.email || "";
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (code) {
      try {
        const settings = await db.select().from(systemSettings);
        const sMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
        const clientId = sMap.sso_google_client_id || "102575897546-jdgokdi2ve911754ig6ic1bg1lm1lv2n.apps.googleusercontent.com";
        const clientSecret = sMap.sso_google_client_secret || "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";
        const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: String(code),
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token || null;
          refreshToken = tokenData.refresh_token || null;

          if (accessToken) {
            const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.email) email = userData.email;
            }
          }
        }
      } catch (tokenErr) {
        console.error("Failed to exchange code with Google token endpoint:", tokenErr);
      }
    }

    if (!email) {
      email = req.user?.email || "Google Account";
    }

    const existing = await db
      .select()
      .from(pmCalendarIntegrations)
      .where(and(eq(pmCalendarIntegrations.practiceId, practiceId), eq(pmCalendarIntegrations.provider, "google")))
      .limit(1);

    if (existing.length > 0) {
      await db.update(pmCalendarIntegrations).set({
        isConnected: true,
        accountEmail: email,
        accessToken: accessToken || existing[0].accessToken,
        refreshToken: refreshToken || existing[0].refreshToken,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(pmCalendarIntegrations.id, existing[0].id));
    } else {
      await db.insert(pmCalendarIntegrations).values({
        practiceId,
        userId,
        provider: "google",
        accountEmail: email,
        accessToken,
        refreshToken,
        calendarName: "Primary Google Calendar",
        syncHmrcDeadlines: true,
        syncMeetings: true,
        syncStaffTasks: true,
        isConnected: true,
        lastSyncedAt: new Date(),
      });
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Connected</title></head>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
          <div style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 360px;">
            <svg style="width: 48px; height: 48px; margin: 0 auto 16px; color: #16a34a;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 style="font-size: 18px; margin: 0 0 8px; color: #0f172a;">Google Authentication Successful!</h2>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">Your Google account has been authenticated and linked with SanSuite.</p>
            <p style="font-size: 11px; color: #94a3b8;">This window will close automatically...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_CALENDAR_SUCCESS', provider: 'google', email: '${email}' }, '*');
            }
            setTimeout(() => { window.close(); }, 1200);
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`Authentication error: ${err.message}`);
  }
});

export default router;
