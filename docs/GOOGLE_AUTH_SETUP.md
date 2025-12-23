# Google Authentication Setup Guide

## ✅ Completed Steps

1. ✅ Google Cloud Console OAuth credentials created
   - Web Client ID: `192701147934-9dg44cgp8ncr8undi7vpjr2e9tpumbh3.apps.googleusercontent.com`
   - iOS Client ID: `192701147934-m3qis098on3dqsstg8qgjq4inopjcvu4.apps.googleusercontent.com`

2. ✅ Native Google Sign-In package installed (`@react-native-google-signin/google-signin`)

3. ✅ Native Google Sign-In implementation completed

## 🔧 Next Steps

### 1. Configure Supabase Dashboard

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/tunjjtfnvtscgmuxjkng
2. Navigate to **Authentication > Providers**
3. Find **Google** and click it
4. Enable the Google provider
5. Add the **Web Client ID**: `192701147934-9dg44cgp8ncr8undi7vpjr2e9tpumbh3.apps.googleusercontent.com`
6. Add the **iOS Client ID** to "Client IDs" field: `192701147934-m3qis098on3dqsstg8qgjq4inopjcvu4.apps.googleusercontent.com`
7. **Enable "Skip nonce check"** (required for native sign-in)
8. Click **Save**

### 2. Add Environment Variables

Add these to your `.env` file in the root directory:

```bash
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=192701147934-9dg44cgp8ncr8undi7vpjr2e9tpumbh3.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=192701147934-m3qis098on3dqsstg8qgjq4inopjcvu4.apps.googleusercontent.com
```

**Important:**
- Restart your Expo dev server after adding these variables
- The `.env` file is already in `.gitignore` (won't be committed)

### 3. Android Client ID (Optional - for later)

When you're ready to test on Android:

1. Get your Android SHA-1 fingerprint:
   ```bash
   # For debug keystore (development)
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # Or from EAS build
   npx expo credentials:manager
   ```

2. Create Android OAuth Client ID in Google Cloud Console:
   - Package name: `com.brigo.app`
   - SHA-1: (from step 1)

3. Add Android Client ID to Supabase dashboard (comma-separated with iOS Client ID)

## 🧪 Testing

1. **Restart your Expo dev server** after adding environment variables
2. Open the app and go to the auth screen
3. Tap "Continue with Google"
4. You should see the native Google sign-in flow
5. After signing in, you should be authenticated

## 📝 Implementation Details

- **Native Sign-In**: Uses `@react-native-google-signin/google-signin` for iOS/Android
- **Supabase Integration**: Uses `signInWithIdToken()` to authenticate with Supabase
- **Error Handling**: Gracefully handles user cancellation
- **Profile Check**: Automatically checks if user profile has names and routes accordingly

## 🔍 Files Modified

- `lib/auth/googleSignIn.ts` - Native Google Sign-In service
- `hooks/useAuthFlow.ts` - Updated to use native Google sign-in
- `app/auth/index.tsx` - Updated to use native Google sign-in
- `app/_layout.tsx` - Initializes Google Sign-In configuration

## ⚠️ Troubleshooting

**"DEVELOPER_ERROR" on Android:**
- Make sure SHA-1 fingerprint matches in Google Cloud Console
- Verify package name is `com.brigo.app`

**"10" error:**
- Check that Client IDs are correctly added in Supabase dashboard
- Verify environment variables are set correctly

**Sign-in not working:**
- Make sure you've restarted the Expo dev server after adding environment variables
- Check that "Skip nonce check" is enabled in Supabase
- Verify Web Client ID is added to Supabase dashboard





