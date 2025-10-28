import { Strategy as CustomStrategy } from "passport-custom";
import axios from "axios";
import { Request } from "express";
import db from "../../config/db";
import { log_error } from "../../shared/utils";

interface MicrosoftGraphProfile {
  id: string;
  mail?: string;
  userPrincipalName: string;
  displayName: string;
  tenantId?: string;
}

async function handleMobileMicrosoftAuth(req: Request, done: any) {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return done(null, false, { message: "Access token is required" });
    }

    // Verify Microsoft access token by calling Microsoft Graph API
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const profile: MicrosoftGraphProfile = response.data;

    // Validate required fields
    if (!profile.mail && !profile.userPrincipalName) {
      return done(null, false, { message: "Email not found in Microsoft profile" });
    }

    const email = (profile.mail || profile.userPrincipalName).toLowerCase().trim();

    // Check for existing local account
    const localAccountResult = await db.query(
      "SELECT 1 FROM users WHERE LOWER(email) = $1 AND password IS NOT NULL AND is_deleted IS FALSE;",
      [email]
    );

    if (localAccountResult.rowCount) {
      const message = `No Microsoft account exists for email ${email}.`;
      return done(null, false, { message });
    }

    // Check if user exists
    const userResult = await db.query(
      "SELECT id, microsoft_id, name, email, active_team FROM users WHERE microsoft_id = $1 OR LOWER(email) = $2;",
      [profile.id, email]
    );

    if (userResult.rowCount) {
      // Existing user - login
      const user = userResult.rows[0];
      return done(null, user, { message: "User successfully logged in" });
    }
    
    // New user - register
    const microsoftUserData = {
      id: profile.id,
      displayName: profile.displayName,
      email: email,
      tenantId: profile.tenantId || null
    };

    const registerResult = await db.query(
      "SELECT register_microsoft_user($1) AS user;",
      [JSON.stringify(microsoftUserData)]
    );
    const { user } = registerResult.rows[0];

    return done(null, user, {
      message: "User successfully registered and logged in",
    });
  } catch (error: any) {
    log_error(error);
    if (error.response?.status === 401) {
      return done(null, false, { message: "Invalid access token" });
    }
    return done(error);
  }
}

export default new CustomStrategy(handleMobileMicrosoftAuth);