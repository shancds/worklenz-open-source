# Azure AD Multi-tenant Setup Guide

## Step-by-Step Instructions

### 1. Access Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory**
3. Click on **App registrations**
4. Find your app: `8620c00b-3f7a-4d76-b329-4b94bb21af0e`

### 2. Change Supported Account Types
1. Click on your app registration
2. Go to **Authentication** in the left sidebar
3. Under **Supported account types**, select one of:
   - **Accounts in any organizational directory (Any Azure AD directory - Multitenant)**
   - **Accounts in any organizational directory and personal Microsoft accounts (e.g. Skype, Xbox)**

### 3. Update Redirect URIs
Ensure your redirect URIs include:
- `http://localhost:3000/secure/microsoft/sso/callback` (for development)
- `https://your-production-domain.com/secure/microsoft/sso/callback` (for production)

### 4. Configure API Permissions
1. Go to **API permissions**
2. Ensure you have these permissions:
   - `openid` (Sign users in)
   - `profile` (View users' basic profile)
   - `email` (View users' email address)
3. Click **Grant admin consent** if required

### 5. Verify Application Settings
1. Go to **Overview**
2. Note down:
   - **Application (client) ID**: Should match your `MICROSOFT_SSO_CLIENT_ID`
   - **Directory (tenant) ID**: This will be your original tenant, but authority should be "common"

### 6. Test the Configuration
After making these changes:
1. Restart your backend server
2. Try logging in with different types of Microsoft accounts:
   - Personal Microsoft account (outlook.com, hotmail.com)
   - Work account from different organization
   - Work account from your organization

## Common Issues and Solutions

### Issue: "AADSTS50020: User account does not exist"
**Solution**: Change supported account types to multi-tenant

### Issue: "AADSTS700016: Application not found"
**Solution**: Verify client ID and ensure app is not deleted

### Issue: "AADSTS50011: Invalid redirect URI"
**Solution**: Add correct redirect URI in Azure AD app registration

### Issue: "AADSTS65001: The user or administrator has not consented"
**Solution**: Grant admin consent for API permissions

## Security Considerations

### Multi-tenant Security
- Users from any organization can sign in
- Implement proper authorization checks in your application
- Consider tenant isolation if needed
- Monitor for suspicious activity

### Recommended Practices
1. **Validate tenant information** in your application logic
2. **Implement proper role-based access control**
3. **Log authentication events** for security monitoring
4. **Use HTTPS in production** for all redirect URIs

## Testing Different Account Types

### Personal Microsoft Account
- outlook.com, hotmail.com, live.com accounts
- Xbox, Skype accounts

### Work/School Accounts
- Accounts from Azure AD tenants
- Office 365 business accounts
- Educational institution accounts

### Guest Accounts
- External users invited to Azure AD tenants
- B2B collaboration accounts