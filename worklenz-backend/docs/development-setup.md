# Development Setup for Microsoft SSO

## Prerequisites

1. **Backend running** on `http://localhost:3000`
2. **Frontend running** on `http://localhost:5000`
3. **Azure AD app configured** with correct redirect URI

## Step-by-Step Setup

### 1. Start Backend
```bash
cd worklenz-backend
npm run dev
```

### 2. Start Frontend
```bash
cd worklenz-frontend
npm run dev
```

### 3. Update Azure AD Redirect URI
In Azure Portal → App registrations → Authentication:
```
http://localhost:3000/secure/microsoft/sso/callback
```

### 4. Test Authentication Flow

1. **Open browser**: `http://localhost:5000/auth/login`
2. **Click**: "Sign in with Microsoft" button
3. **Redirects to**: Microsoft login page
4. **After login**: Redirects back to your app

## Environment Configuration

### Backend (.env)
```env
MICROSOFT_SSO_REDIRECT_URI="http://localhost:3000/secure/microsoft/sso/callback"
MICROSOFT_SSO_AUTHORITY="https://login.microsoftonline.com/common"
LOGIN_SUCCESS_REDIRECT="http://localhost:5000/auth/authenticating"
LOGIN_FAILURE_REDIRECT="http://localhost:5000/auth/authenticating"
```

### Frontend (.env.development)
```env
VITE_ENABLE_MICROSOFT_LOGIN=true
VITE_API_URL=http://localhost:3000
```

## Authentication Flow

1. **User clicks** "Sign in with Microsoft" on frontend
2. **Frontend redirects** to `http://localhost:3000/secure/microsoft/sso`
3. **Backend redirects** to Microsoft login page
4. **User authenticates** with Microsoft
5. **Microsoft redirects** to `http://localhost:3000/secure/microsoft/sso/callback`
6. **Backend processes** the callback and creates session
7. **Backend redirects** to `http://localhost:5000/auth/authenticating`
8. **Frontend handles** the authentication result

## Troubleshooting

### Issue: "ENOENT: no such file or directory"
**Cause**: Accessing backend URL directly instead of starting from frontend
**Solution**: Always start from `http://localhost:5000/auth/login`

### Issue: "Invalid redirect URI"
**Cause**: Azure AD redirect URI doesn't match backend configuration
**Solution**: Update Azure AD app registration with correct URI

### Issue: "User account does not exist in tenant"
**Cause**: Single-tenant configuration
**Solution**: Change to multi-tenant in Azure AD app registration