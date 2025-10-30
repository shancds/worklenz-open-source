# Testing Microsoft SSO Manual Provisioning

## Test Scenarios

### Scenario 1: User Without Invitation (Should Fail)

1. **Set manual mode**:
   ```env
   SSO_PROVISIONING_MODE="manual"
   ```

2. **Restart backend server**

3. **Try to sign in** with Microsoft account that has no invitation

4. **Expected result**: 
   - Login fails
   - Error message: "Only invited members can sign up. Please contact your administrator for an invitation."

### Scenario 2: User With Invitation (Should Succeed)

1. **Create invitation** in database:
   ```sql
   -- First, create a team member record
   INSERT INTO team_members (team_id, role_id, active) 
   VALUES ('your-team-id', 'your-role-id', true);
   
   -- Then create the invitation
   INSERT INTO email_invitations (email, name, team_id, team_member_id)
   VALUES ('test@example.com', 'Test User', 'your-team-id', 'team-member-id-from-above');
   ```

2. **Try to sign in** with Microsoft account using `test@example.com`

3. **Expected result**:
   - Login succeeds
   - User is created in `users` table
   - User is assigned to the team
   - Invitation is removed from `email_invitations` table

### Scenario 3: Existing User Accessing New Team (Should Check Invitation)

1. **User already exists** in system

2. **Create team invitation** for existing user's email

3. **User tries to access team** via invitation link

4. **Expected result**:
   - User gains access to new team
   - Invitation is processed and removed

## Database Queries for Testing

### Check Invitations
```sql
SELECT * FROM email_invitations WHERE email = 'test@example.com';
```

### Check User Creation
```sql
SELECT id, email, microsoft_id, active_team FROM users WHERE email = 'test@example.com';
```

### Check Team Membership
```sql
SELECT tm.*, t.name as team_name 
FROM team_members tm 
JOIN teams t ON tm.team_id = t.id 
WHERE tm.user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

### Cleanup Test Data
```sql
-- Remove test user
DELETE FROM users WHERE email = 'test@example.com';

-- Remove test invitations
DELETE FROM email_invitations WHERE email = 'test@example.com';
```

## Manual Test Steps

### 1. Setup Test Environment

```bash
# Set manual provisioning mode
echo 'SSO_PROVISIONING_MODE="manual"' >> .env

# Restart backend
npm run dev
```

### 2. Test Without Invitation

1. Go to `http://localhost:5000/auth/login`
2. Click "Sign in with Microsoft"
3. Use an email that has no invitation
4. Verify rejection message appears

### 3. Test With Invitation

1. Create invitation in database (see SQL above)
2. Go to `http://localhost:5000/auth/login`
3. Click "Sign in with Microsoft"
4. Use the invited email address
5. Verify successful login and team assignment

### 4. Verify Cleanup

1. Check that invitation was removed from database
2. Check that user was added to correct team
3. Verify user can access team resources

## Automated Test Script

Create a test script to verify the functionality:

```javascript
// test-manual-provisioning.js
const { Client } = require('pg');

async function testManualProvisioning() {
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
  });

  await client.connect();

  try {
    // Test 1: Check if invitation exists
    const invitationCheck = await client.query(
      'SELECT * FROM email_invitations WHERE email = $1',
      ['test@example.com']
    );
    
    console.log('Invitations found:', invitationCheck.rowCount);

    // Test 2: Check if user exists
    const userCheck = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['test@example.com']
    );
    
    console.log('Users found:', userCheck.rowCount);

  } finally {
    await client.end();
  }
}

testManualProvisioning().catch(console.error);
```

## Expected Behavior Summary

| Scenario | Provisioning Mode | Has Invitation | Result |
|----------|------------------|----------------|---------|
| New User | Auto | N/A | ✅ Success |
| New User | Manual | ❌ No | ❌ Rejected |
| New User | Manual | ✅ Yes | ✅ Success + Team Assignment |
| Existing User | Auto | N/A | ✅ Success |
| Existing User | Manual | ❌ No Team Invite | ❌ Team Access Denied |
| Existing User | Manual | ✅ Yes Team Invite | ✅ Success + Team Access |

## Troubleshooting

### Issue: Manual mode not working
- Check `SSO_PROVISIONING_MODE` environment variable
- Restart backend server after config change
- Verify environment variable is loaded correctly

### Issue: Invitations not being processed
- Check database connection
- Verify `accept_invitation` function exists
- Check for foreign key constraint errors

### Issue: Users not being added to teams
- Verify team_id and team_member_id in invitation
- Check `set_active_team` function
- Ensure team and role exist in database