## Apple Credential State Checking Implementation

### What was implemented:

1. **Added Apple credential state checking to auth store**:

   - `checkAppleCredentialState()` method that checks if user's Apple credentials are still valid
   - Stores Apple user ID during login for future credential checks
   - Automatically logs out user if credentials are revoked

2. **Enhanced secure storage**:

   - Added `APPLE_USER_ID_KEY` to store the Apple user identifier
   - Updated `setUser()` to accept and store Apple user ID
   - Updated `logout()` to clear Apple user ID

3. **App state monitoring**:
   - Added `AppState` listener in TodoApp component
   - Automatically checks credential state when app returns to foreground
   - Logs relevant events for debugging

### Key features:

- **Automatic credential validation**: When the user returns to the app, it checks if their Apple Sign-In credentials are still valid
- **Graceful error handling**: Network errors don't trigger logout, only explicit revocation
- **Secure storage**: Apple user ID is stored securely alongside token and name
- **Background monitoring**: Works automatically without user intervention

### Flow:

1. User signs in with Apple → Apple user ID is stored
2. App goes to background
3. User revokes app access in Apple ID settings
4. App returns to foreground → credential check detects revocation
5. User is automatically logged out

### Testing:

To test this functionality:

1. Sign in with Apple
2. Go to iOS Settings > Apple ID > Sign-In & Security > Apps Using Apple ID
3. Find your app and revoke access
4. Return to the app
5. The app should automatically log you out

This ensures users can't continue using the app with revoked credentials, maintaining security and compliance with Apple's guidelines.
