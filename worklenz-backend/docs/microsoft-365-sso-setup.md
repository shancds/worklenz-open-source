# Microsoft 365 SSO Setup Guide

## Overview

This guide explains how to set up Microsoft 365 Single Sign-On (SSO) for Worklenz using MSAL (Microsoft Authentication Library).

## Prerequisites

1. Azure AD tenant with admin permissions
2. Worklenz backend running with HTTPS endpoints
3. Environment variables configured

## Azure AD Application Registration

### Step 1: Register Application

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Click "New registration"
3. Fill in the details:
   - **Name**: Worklenz SSO
   - **Supported account types**: Choose based on your needs:
     - Single tenant: For organization-specific access
     - Multi-tenant: For multiple organizations
   - **Redirect URI**: `https://your-domain.com/secure/microsoft/sso/callback`

### Step 2: Configure Authentication

1. Go to Authentication section
2. Add redirect URIs:
   - Web: `https://your-domain.com/secure/microsoft/sso/callback`
   - For development: `http://localhost:3000/secure/microsoft/sso/callback`
3. Enable ID tokens under "Implicit grant and hybrid flows"

### Step 3: Create Client Secret

1. Go to Certificates & secrets
2. Click "New client secret"
3. Add description and set expiration
4. Copy the secret value (you won't see it again)

### Step 4: Configure API Permissions

1. Go to API permissions
2. Default permissions (openid, profile, email) are sufficient
3. Grant admin consent if required

## Backend Configuration

### Environment Variables

Update your `.env` file with the following variables:

```env
# Microsoft 365 SSO (MSAL)
MICROSOFT_SSO_CLIENT_ID="your_client_id_here"
MICROSOFT_SSO_CLIENT_SECRET="your_client_secret_here"
MICROSOFT_SSO_TENANT_ID="your_tenant_id_here"
MICROSOFT_SSO_AUTHORITY="https://login.microsoftonline.com/your_tenant_id_here"
MICROSOFT_SSO_REDIRECT_URI="https://your-domain.com/secure/microsoft/sso/callback"
SSO_PROVISIONING_MODE="auto"
```

### Database Migration

Run the database migration to add Microsoft SSO fields:

```sql
-- This migration is automatically included in the codebase
-- File: database/migrations/20250127000000-add-microsoft-sso-fields.sql
```

## User Provisioning Modes

### Auto Provisioning (Default)
- New users are automatically created on first login
- Users get default team and organization setup
- Recommended for most scenarios

### Manual Provisioning
- Admin must pre-create users before they can login
- Set `SSO_PROVISIONING_MODE="manual"` in environment
- Users will see error message if not provisioned

## Authentication Endpoints

### Web Authentication
- **Initiate**: `GET /secure/microsoft/sso`
- **Callback**: `GET /secure/microsoft/sso/callback`

### Mobile Authentication
- **Endpoint**: `POST /secure/microsoft/mobile`
- **Body**: `{ "accessToken": "microsoft_access_token" }`

## Frontend Integration

Add a "Sign in with Microsoft" button that redirects to:
```
/secure/microsoft/sso
```

For invitation flows, include state parameters:
```
/secure/microsoft/sso?team=TEAM_ID&teamMember=MEMBER_ID
```

## Security Considerations

1. **HTTPS Required**: All redirect URIs must use HTTPS in production
2. **Secret Management**: Store client secrets securely (not in plain text)
3. **Token Validation**: MSAL handles token validation automatically
4. **Session Management**: Uses existing Worklenz session infrastructure

## Troubleshooting

### Common Issues

1. **Invalid Redirect URI**
   - Ensure redirect URI in Azure matches exactly
   - Check for trailing slashes

2. **Client Secret Expired**
   - Generate new secret in Azure portal
   - Update environment variables

3. **Tenant Configuration**
   - Verify tenant ID is correct
   - Check if multi-tenant access is needed

4. **User Not Provisioned** (Manual mode)
   - Admin needs to create user account first
   - Or switch to auto provisioning mode

### Debug Logging

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will show detailed MSAL logs in the console.

## Testing

1. **Web Flow**: Navigate to `/secure/microsoft/sso`
2. **Mobile Flow**: Send POST request to `/secure/microsoft/mobile` with access token
3. **Verify**: Check user creation in database
4. **Session**: Confirm user session is established

## Migration from Legacy OAuth2

If you have existing Microsoft OAuth2 implementation:

1. Users with existing `microsoft_id` will continue to work
2. New fields `microsoft_tenant_id` added for better tenant management
3. Legacy endpoints can coexist during transition period

## Support

For issues related to:
- Azure AD configuration: Check Azure documentation
- Backend integration: Review server logs
- Database issues: Check migration status
- Frontend integration: Verify redirect URIs