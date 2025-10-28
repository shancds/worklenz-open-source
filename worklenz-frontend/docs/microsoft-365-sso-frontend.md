# Microsoft 365 SSO Frontend Integration

## Overview

This document describes the frontend implementation for Microsoft 365 Single Sign-On (SSO) in Worklenz.

## Features Added

### 1. Environment Configuration
- Added `VITE_ENABLE_MICROSOFT_LOGIN` environment variable
- Controls visibility of Microsoft login buttons
- Can be used alongside Google login

### 2. UI Components
- **Login Page**: Added "Sign in with Microsoft" button
- **Signup Page**: Added "Sign up with Microsoft" button
- Microsoft icon integration
- Responsive design matching existing Google button style

### 3. Authentication Flow
- Redirects to `/secure/microsoft/sso` endpoint
- Supports invitation parameters (team, teamMember, project)
- Handles authentication callbacks automatically

### 4. Internationalization
- Added translations for Microsoft login buttons
- Supported languages:
  - English: "Sign in with Microsoft" / "Sign up with Microsoft"
  - German: "Mit Microsoft anmelden" / "Mit Microsoft registrieren"
  - Spanish: "Iniciar sesión con Microsoft" / "Registrarse con Microsoft"

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Microsoft 365 Login
VITE_ENABLE_MICROSOFT_LOGIN=true
```

### Available Options

- `VITE_ENABLE_MICROSOFT_LOGIN=true` - Shows Microsoft login buttons
- `VITE_ENABLE_MICROSOFT_LOGIN=false` - Hides Microsoft login buttons

## Usage

### Login Page
When enabled, users will see:
1. Email/password form
2. "Log in" button
3. "OR" separator (if any SSO provider is enabled)
4. "Sign in with Google" button (if Google is enabled)
5. "Sign in with Microsoft" button (if Microsoft is enabled)

### Signup Page
When enabled, users will see:
1. Registration form
2. "Sign up" button
3. "OR" separator (if any SSO provider is enabled)
4. "Sign up with Google" button (if Google is enabled)
5. "Sign up with Microsoft" button (if Microsoft is enabled)

## Technical Implementation

### Button Styling
Microsoft buttons use the same styling as Google buttons:
- Consistent border radius (4px)
- Same size and spacing
- Microsoft icon with proper sizing
- Responsive design

### Event Handling
```typescript
const handleMicrosoftLogin = useCallback(() => {
  try {
    window.location.href = `${import.meta.env.VITE_API_URL}/secure/microsoft/sso`;
  } catch (error) {
    logger.error('Microsoft login failed', error);
  }
}, [trackMixpanelEvent, t]);
```

### Invitation Support
For team invitations, the frontend automatically appends query parameters:
```
/secure/microsoft/sso?team=TEAM_ID&teamMember=MEMBER_ID&project=PROJECT_ID
```

## Testing

### Unit Tests
Added comprehensive tests for:
- Microsoft button visibility
- Click event handling
- URL redirection
- Environment variable handling

### Test Commands
```bash
# Run all tests
npm test

# Run auth-specific tests
npm test -- --testPathPattern=auth
```

## Styling

### Microsoft Icon
- SVG format for crisp rendering
- 20x20 pixels
- Microsoft brand colors:
  - Red: #F25022
  - Green: #7FBA00
  - Blue: #00A4EF
  - Yellow: #FFB900

### Button Layout
```css
.microsoftButton {
  borderRadius: 4px;
  display: flex;
  alignItems: center;
  justifyContent: center;
}

.microsoftIcon {
  maxWidth: 20px;
  marginRight: 8px;
}
```

## Error Handling

### Frontend Error Handling
- Graceful fallback if Microsoft login fails
- Error logging for debugging
- User-friendly error messages

### Common Issues
1. **Button not showing**: Check `VITE_ENABLE_MICROSOFT_LOGIN` environment variable
2. **Redirect fails**: Verify `VITE_API_URL` is correctly set
3. **Icon not loading**: Ensure SVG file is properly imported

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Features Used
- Modern JavaScript (ES2020)
- SVG icons
- CSS Flexbox
- React Hooks

## Security Considerations

### Frontend Security
- No sensitive data stored in frontend
- Secure redirects to backend endpoints
- HTTPS required for production

### CSRF Protection
- Backend handles CSRF token validation
- Frontend automatically includes tokens in requests

## Deployment

### Build Process
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Serve built files
npm run preview
```

### Environment Setup
1. Set `VITE_ENABLE_MICROSOFT_LOGIN=true` in production environment
2. Ensure `VITE_API_URL` points to correct backend
3. Verify HTTPS is enabled for production

## Troubleshooting

### Debug Mode
Enable debug logging by setting:
```env
VITE_APP_ENV=development
```

### Common Solutions
1. **Clear browser cache** if buttons don't appear
2. **Check console errors** for JavaScript issues
3. **Verify environment variables** are loaded correctly
4. **Test backend endpoints** are accessible

## Future Enhancements

### Potential Improvements
1. **Analytics Integration**: Add Microsoft login tracking events
2. **Mobile Optimization**: Enhanced mobile experience
3. **Loading States**: Better loading indicators during redirect
4. **Error Recovery**: Automatic retry mechanisms

### Accessibility
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode compatibility
- Focus management