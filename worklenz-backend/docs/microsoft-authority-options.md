# Microsoft Authority Endpoint Options

## Authority Endpoint Configurations

Choose the appropriate authority endpoint based on your requirements:

### 1. Multi-tenant (Any Organization + Personal Accounts)
```env
MICROSOFT_SSO_AUTHORITY="https://login.microsoftonline.com/common"
MICROSOFT_SSO_TENANT_ID="common"
```
**Allows**: Any Microsoft account (work, school, or personal)
**Use case**: Public SaaS applications

### 2. Multi-tenant (Organizations Only)
```env
MICROSOFT_SSO_AUTHORITY="https://login.microsoftonline.com/organizations"
MICROSOFT_SSO_TENANT_ID="organizations"
```
**Allows**: Any work or school account from any Azure AD tenant
**Use case**: B2B applications that don't want personal accounts

### 3. Single Tenant (Your Organization Only)
```env
MICROSOFT_SSO_AUTHORITY="https://login.microsoftonline.com/f13e3085-0c7f-4ced-92bd-a60a0f2d8e72"
MICROSOFT_SSO_TENANT_ID="f13e3085-0c7f-4ced-92bd-a60a0f2d8e72"
```
**Allows**: Only users from your specific Azure AD tenant
**Use case**: Internal company applications

### 4. Personal Accounts Only
```env
MICROSOFT_SSO_AUTHORITY="https://login.microsoftonline.com/consumers"
MICROSOFT_SSO_TENANT_ID="consumers"
```
**Allows**: Only personal Microsoft accounts (outlook.com, hotmail.com, etc.)
**Use case**: Consumer applications

## Recommended Configuration

For Worklenz (SaaS application), use **multi-tenant with all account types**:

```env
MICROSOFT_SSO_AUTHORITY="https://login.microsoftonline.com/common"
MICROSOFT_SSO_TENANT_ID="common"
```

This allows the broadest access while maintaining security.