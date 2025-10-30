# Microsoft SSO Manual Provisioning

## Overview

Manual provisioning mode ensures that only invited users can sign up or sign in using Microsoft SSO. This provides administrators with complete control over who can access the system.

## Configuration

### Enable Manual Provisioning

Set in your `.env` file:

```env
SSO_PROVISIONING_MODE="manual"
```

### Available Modes

- **`"auto"`** - Any Microsoft user can sign up automatically
- **`"manual"`** - Only invited users can sign up or access teams

## How Manual Provisioning Works

### 1. User Registration Flow

When `SSO_PROVISIONING_MODE="manual"`:

1. **User clicks "Sign in with Microsoft"**
2. **Microsoft authentication succeeds**
3. **System checks `email_invitations` table** for user's email
4. **If invitation exists:**
   - User is registered/logged in
   - User is added to the invited team
   - Invitation is removed from `email_invitations`
5. **If no invitation exists:**
   - Access is denied
   - User sees: "Only invited members can sign up. Please contact your administrator for an invitation."

### 2. Existing User Login Flow

For users who already have accounts:

1. **User tries to access a team via invitation link**
2. **System checks if user has invitation for that specific team**
3. **If team invitation exists:**
   - User is added to the team
   - Invitation is accepted and removed
4. **If no team invitation:**
   - Access to that team is denied
   - User sees: "You don't have an invitation to access this team. Please contact your administrator."

## Database Structure

### email_invitations Table

```sql
CREATE TABLE email_invitations (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           TEXT NOT NULL,
    email          TEXT NOT NULL,
    team_id        UUID REFERENCES teams(id),
    team_member_id UUID REFERENCES team_members(id),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Key Fields

- **`email`** - The invited user's email address (case-insensitive matching)
- **`team_id`** - The team the user is invited to join
- **`team_member_id`** - The team member record created for this invitation

## Admin Workflow

### 1. Invite a User

Administrators must create invitations through the Worklenz admin interface:

1. **Go to Team Settings**
2. **Click "Invite Members"**
3. **Enter user's email address**
4. **Select role/permissions**
5. **Send invitation**

This creates a record in `email_invitations` table.

### 2. User Accepts Invitation

When the invited user signs in with Microsoft:

1. **System finds their email in `email_invitations`**
2. **User account is created (if new user)**
3. **User is added to the invited team**
4. **Invitation record is deleted**

## Error Messages

### For New Users (No Invitation)

```
Only invited members can sign up. Please contact your administrator for an invitation.
```

### For Existing Users (No Team Invitation)

```
You don't have an invitation to access this team. Please contact your administrator.
```

### For Users with Existing Local Account

```
No Microsoft account exists for email user@example.com.
```

### For Users with Existing Google Account

```
Google account exists for email user@example.com.
```

## Security Benefits

### 1. Controlled Access
- Only pre-approved users can access the system
- Administrators have full control over user registration

### 2. Team Isolation
- Users can only join teams they're explicitly invited to
- Prevents unauthorized team access

### 3. Audit Trail
- All invitations are tracked in the database
- Clear record of who was invited when

## Implementation Details

### Code Flow

```typescript
// Check for invitation
const invitationResult = await db.query(
  "SELECT ei.team_id, ei.team_member_id, ei.name FROM email_invitations ei WHERE LOWER(ei.email) = $1;",
  [normalizedEmail]
);

if (!invitationResult.rowCount) {
  // Deny access - no invitation found
  return done(null, false, { message: "Only invited members can sign up..." });
}

// Accept invitation
await db.query("SELECT accept_invitation($1, $2, $3);", [
  normalizedEmail,
  invitation.team_member_id,
  user.id
]);
```

### Database Functions Used

- **`accept_invitation(email, team_member_id, user_id)`** - Processes the invitation acceptance
- **`register_microsoft_user(user_data)`** - Creates the user account

## Testing Manual Provisioning

### 1. Enable Manual Mode

```env
SSO_PROVISIONING_MODE="manual"
```

### 2. Test Without Invitation

1. Try to sign in with Microsoft using an uninvited email
2. Should see rejection message

### 3. Test With Invitation

1. Create invitation through admin interface
2. Sign in with Microsoft using invited email
3. Should succeed and join the team

### 4. Verify Invitation Cleanup

1. Check `email_invitations` table after successful login
2. Invitation record should be deleted
3. User should be in `team_members` table

## Troubleshooting

### Issue: User can't sign up despite invitation

**Check:**
1. Email address matches exactly (case-insensitive)
2. Invitation exists in `email_invitations` table
3. `SSO_PROVISIONING_MODE="manual"` is set
4. Backend server was restarted after config change

### Issue: User joins wrong team

**Check:**
1. Invitation has correct `team_id`
2. `accept_invitation` function is working properly
3. User is accessing correct invitation link

### Issue: Invitations not being cleaned up

**Check:**
1. `accept_invitation` function is being called
2. Database permissions allow deletion from `email_invitations`
3. No foreign key constraint issues

## Migration from Auto to Manual

### 1. Update Configuration

```env
# Change from:
SSO_PROVISIONING_MODE="auto"

# To:
SSO_PROVISIONING_MODE="manual"
```

### 2. Create Invitations for Existing Users

If you have users who should continue to have access:

1. **Identify existing Microsoft SSO users**
2. **Create invitations for them** through admin interface
3. **Test their access** after enabling manual mode

### 3. Communicate Changes

Inform your team about the new invitation-only policy to avoid confusion.

## Best Practices

### 1. Regular Cleanup
- Monitor `email_invitations` table for expired invitations
- Remove old invitations that won't be used

### 2. Clear Communication
- Inform users about invitation-only policy
- Provide clear instructions for requesting access

### 3. Admin Training
- Train administrators on invitation process
- Document your organization's invitation approval workflow

### 4. Monitoring
- Log invitation acceptances for audit purposes
- Monitor failed login attempts for uninvited users