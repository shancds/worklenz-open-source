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
    const provisioningMode = process.env.SSO_PROVISIONING_MODE || "auto";

    if (provisioningMode === "manual") {
      // Check if user has an email invitation
      const invitationResult = await db.query(
        "SELECT ei.team_id, ei.team_member_id, ei.name FROM email_invitations ei WHERE LOWER(ei.email) = $1;",
        [email]
      );

      if (!invitationResult.rowCount) {
        return done(null, false, { message: "Only invited members can sign up. Please contact your administrator for an invitation." });
      }

      // User has invitation - proceed with registration
      const invitation = invitationResult.rows[0];
      
      const microsoftUserData = {
        id: profile.id,
        displayName: profile.displayName,
        email: email,
        tenantId: profile.tenantId || null,
        team: invitation.team_id,
        member_id: invitation.team_member_id,
        invited_team_id: invitation.team_id,
        team_member_id: invitation.team_member_id
      };

      const registerResult = await db.query(
        "SELECT register_microsoft_user($1) AS user;",
        [JSON.stringify(microsoftUserData)]
      );
      const { user } = registerResult.rows[0];

      // Accept the invitation
      try {
        await db.query("SELECT accept_invitation($1, $2, $3);", [
          email,
          invitation.team_member_id,
          user.id
        ]);
      } catch (error) {
        log_error(error, user);
      }

      return done(null, user, { message: "User successfully registered and logged in" });
    } else {
      // Auto-provisioning mode
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

      return done(null, user, { message: "User successfully registered and logged in" });
    }
  } catch (error: any) {
    log_error(error);
    if (error.response?.status === 401) {
      return done(null, false, { message: "Invalid access token" });
    }
    return done(null, false, {message: `Microsoft authentication failed: ${error.errorMessage || error.message}`});
  }
}

export default new CustomStrategy(handleMobileMicrosoftAuth);