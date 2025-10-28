import { Strategy as CustomStrategy } from "passport-custom";
import { Request } from "express";
import MSALConfig from "../../config/msal-config";
import { sendWelcomeEmail } from "../../shared/email-templates";
import { log_error } from "../../shared/utils";
import db from "../../config/db";
import { ERROR_KEY } from "./passport-constants";

interface MicrosoftProfile {
  oid: string;
  email: string;
  name: string;
  tid: string;
  preferred_username: string;
}

async function handleMicrosoftSSO(req: Request, done: any) {
  try {
    const { code, state } = req.query;

    if (!code) {
      return done(null, false, { message: "Authorization code is required" });
    }

    const msalInstance = MSALConfig.getInstance();
    const tokenRequest = MSALConfig.getTokenRequestParameters(code as string);

    // Exchange authorization code for tokens
    const response = await msalInstance.acquireTokenByCode(tokenRequest);

    if (!response || !response.idTokenClaims) {
      return done(null, false, { message: "Failed to acquire token" });
    }

    const profile = response.idTokenClaims as MicrosoftProfile;

    // Validate required claims
    if (!profile.email || !profile.oid || !profile.tid) {
      return done(null, false, { message: "Invalid token claims" });
    }

    // Normalize email
    const normalizedEmail = profile.email.toLowerCase().trim();

    // Check for existing local account
    const localAccountResult = await db.query(
      "SELECT 1 FROM users WHERE LOWER(email) = $1 AND password IS NOT NULL AND is_deleted IS FALSE;",
      [normalizedEmail]
    );

    if (localAccountResult.rowCount) {
      const message = `No Microsoft account exists for email ${profile.email}.`;
      (req.session as any).error = message;
      return done(null, false, { message: req.flash(ERROR_KEY, message) });
    }

    // Check for existing google account
    const googleAccountResult = await db.query(
      "SELECT 1 FROM users WHERE LOWER(email) = $1 AND google_id IS NOT NULL AND is_deleted IS FALSE;",
    [normalizedEmail]);

    if (googleAccountResult.rowCount) {
      const message = `Google account exists for email ${profile.email}.`;
      (req.session as any).error = message;
      return done(null, false, { message: req.flash(ERROR_KEY, message) });
    }

    // Handle invitation state if present
    const stateData = state ? JSON.parse(state as string || "{}") : {};
    const body: any = {
      id: profile.oid,
      displayName: profile.name,
      email: normalizedEmail,
      tenantId: profile.tid,
      ...stateData
    };

    // Check if user exists
    const userResult = await db.query(
      "SELECT id, microsoft_id, name, email, active_team FROM users WHERE microsoft_id = $1 OR LOWER(email) = $2;",
      [profile.oid, normalizedEmail]
    );

    if (userResult.rowCount) {
      // Existing user - login
      const user = userResult.rows[0];

      // Update active team if user came from invitation
      if (stateData.team) {
        try {
          await db.query("SELECT set_active_team($1, $2);", [user.id, stateData.team]);
        } catch (error) {
          log_error(error, user);
        }
      }

      return done(null, user, { message: "User successfully logged in" });
    } else {
      // New user - register (auto-provisioning)
      const provisioningMode = process.env.SSO_PROVISIONING_MODE || "auto";

      if (provisioningMode === "manual") {
        const message = `User not provisioned. Please contact your administrator.`;
        (req.session as any).error = message;
        return done(null, false, { message: req.flash(ERROR_KEY, message) });
      }

      // Auto-provision new user
      const registerResult = await db.query(
        "SELECT register_microsoft_user($1) AS user;",
        [JSON.stringify(body)]
      );
      const { user } = registerResult.rows[0];

      sendWelcomeEmail(user.email, body.displayName);
      return done(null, user, { message: "User successfully registered and logged in" });
    }
  } catch (error: any) {
    log_error(error);

    // Handle specific Microsoft authentication errors
    if (error.errorCode) {
      switch (error.errorCode) {
        case 'AADSTS50020':
          return done(null, false, { message: "User account does not exist in tenant. Please contact your administrator or use a different account." });
        case 'AADSTS700016':
          return done(null, false, { message: "Application not found. Please contact support." });
        case 'AADSTS50011':
          return done(null, false, { message: "Invalid redirect URI. Please contact support." });
        case 'AADSTS65001':
          return done(null, false, { message: "Admin consent required. Please contact your administrator." });
        default:
          return done(null, false, { message: `Microsoft authentication failed: ${error.errorMessage || error.message}` });
      }
    }

    return done(null, false, {message: `Microsoft authentication failed: ${error.errorMessage || error.message}`});
  }
}

export default new CustomStrategy(handleMicrosoftSSO);