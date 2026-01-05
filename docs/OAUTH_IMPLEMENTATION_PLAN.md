# OAuth Implementation Plan: Google & Apple with Supabase

## Overview
This plan outlines the secure implementation of Google and Apple OAuth authentication using Supabase, focusing on **native sign-in** for mobile apps (recommended by Supabase) rather than OAuth web flows.

## Current State
- ✅ Using `signInWithOAuth()` with web-based OAuth flow
- ⚠️ Deep link handling has security issues (tokens in URL)
- ⚠️ Magic links/OTP used for testing (to be removed)

## Target State
- ✅ Native Google Sign-In for iOS/Android
- ✅ Native Apple Sign-In for iOS
- ✅ Secure deep link handling for OAuth callbacks (if needed)
- ✅ No magic links/OTP in production

---

## Part 1: Google OAuth Setup

### 1.1 Google Cloud Console Configuration

#### Step 1: Create OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Navigate to **APIs & Services > Credentials**
4. Create **OAuth 2.0 Client IDs** for:
   - **Web Application** (required for Supabase)
   - **iOS** (for native iOS sign-in)
   - **Android** (for native Android sign-in)

#### Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**
2. Add your Supabase project domain: `<project-id>.supabase.co`
3. Configure scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
4. Add Privacy Policy and Terms of Service URLs

#### Step 3: Get Client IDs
- **Web Client ID**: Used in Supabase dashboard
- **iOS Client ID**: Bundle ID: `com.brigo.ai`
- **Android Client ID**: Package: `com.brigo.ai` + SHA-1 fingerprint

**To get Android SHA-1:**
```bash
# For debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For production (when ready)
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

### 1.2 Supabase Dashboard Configuration

1. Go to **Authentication > Providers > Google**
2. Enable Google provider
3. Add **Web Client ID** (from Google Cloud Console)
4. Add **iOS Client ID** to "Client IDs" field (comma-separated)
5. Add **Android Client ID** to "Client IDs" field (comma-separated)
6. **Skip nonce check**: Enable (for native sign-in)

### 1.3 Implementation Options

#### Option A: Native Sign-In (Recommended for Mobile)
**Pros:**
- Better UX (native UI)
- More secure (no browser redirect)
- Works offline
- No deep link security issues

**Cons:**
- Requires native libraries
- Platform-specific code

**Libraries:**
- iOS/Android: `@react-native-google-signin/google-signin` (Premium version supports nonce)
- Alternative: Use Supabase's `signInWithOAuth` with `skipBrowserRedirect: true` + `expo-web-browser`

#### Option B: OAuth Flow with Secure Deep Linking
**Pros:**
- Works across all platforms
- Simpler implementation
- No native dependencies

**Cons:**
- Requires secure deep link handling
- Browser redirect (less native feel)

---

## Part 2: Apple OAuth Setup

### 2.1 Apple Developer Console Configuration

#### Step 1: Register App ID
1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles > Identifiers**
3. Create/select App ID: `com.brigo.ai`
4. Enable **Sign in with Apple** capability

#### Step 2: Create Services ID (for Web/Android)
1. Go to **Identifiers > Services IDs**
2. Create new Services ID (e.g., `com.brigo.ai.web`)
3. Enable **Sign in with Apple**
4. Configure **Website URLs**:
   - **Domains**: `<project-id>.supabase.co`
   - **Return URLs**: `https://<project-id>.supabase.co/auth/v1/callback`

#### Step 3: Create Signing Key
1. Go to **Keys** section
2. Create new key with **Sign in with Apple** enabled
3. Download `.p8` file (save securely - can't download again!)
4. Note the **Key ID**
5. Get your **Team ID** (10-character alphanumeric)

#### Step 4: Generate Client Secret
Use Supabase's [Apple Secret Generator](https://supabase.com/docs/guides/auth/social-login/auth-apple#configuration-web) or generate manually:

```bash
# Requires: Team ID, Key ID, Services ID, and .p8 file
# Use Supabase's tool in dashboard (recommended)
```

**⚠️ Important:** Client secret expires every 6 months - set calendar reminder!

### 2.2 Supabase Dashboard Configuration

1. Go to **Authentication > Providers > Apple**
2. Enable Apple provider
3. Add **Services ID** as Client ID
4. Add generated **Client Secret**
5. Add **App ID** (`com.brigo.ai`) to "Client IDs" field

### 2.3 Implementation Options

#### Option A: Native Sign-In (iOS Only)
**Library:** `expo-apple-authentication` or `@invertase/react-native-apple-authentication`

**Pros:**
- Native iOS experience
- No browser redirect
- More secure

**Cons:**
- iOS only (Android/Web need OAuth flow)
- Requires native dependencies

#### Option B: OAuth Flow (Cross-Platform)
**Pros:**
- Works on iOS, Android, Web
- Single implementation

**Cons:**
- Browser redirect
- Requires secure deep linking

---

## Part 3: Implementation Strategy

### Recommended Approach: Hybrid

1. **iOS**: Use native sign-in for both Google and Apple
2. **Android**: Use native sign-in for Google, OAuth flow for Apple
3. **Web**: Use OAuth flow for both (or Google One Tap)

### Implementation Steps

#### Step 1: Install Dependencies

```bash
# For Google native sign-in (iOS/Android)
npx expo install @react-native-google-signin/google-signin

# For Apple native sign-in (iOS)
npx expo install expo-apple-authentication

# For Apple on Android/Web (if needed)
npx expo install @invertase/react-native-apple-authentication

# For secure OAuth flow (if using)
npx expo install expo-web-browser
npx expo install expo-auth-session
```

#### Step 2: Update app.json

```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true,
      "bundleIdentifier": "com.brigo.ai"
    },
    "android": {
      "package": "com.brigo.ai"
    },
    "scheme": "brigo"
  }
}
```

#### Step 3: Create Secure Auth Components

**File Structure:**
```
components/auth/
  ├── GoogleSignInButton.tsx (native)
  ├── AppleSignInButton.tsx (native iOS)
  ├── AppleSignInButton.android.tsx (OAuth for Android)
  └── useSecureOAuth.ts (secure OAuth flow handler)
```

#### Step 4: Secure Deep Link Handling

**Key Security Improvements:**
1. Use `signInWithIdToken()` instead of extracting tokens from URL
2. Validate tokens before use
3. Clear URL after processing
4. Use Supabase's built-in session management

---

## Part 4: Security Best Practices

### 4.1 Token Handling

✅ **DO:**
- Use `signInWithIdToken()` for native sign-in
- Let Supabase handle session management
- Store sessions in SecureStore (encrypted)
- Validate token format before use

❌ **DON'T:**
- Extract tokens from URL query parameters
- Store tokens in AsyncStorage (unencrypted)
- Log tokens or include in error messages
- Share tokens between users

### 4.2 Deep Link Security

**For OAuth callbacks (if using OAuth flow):**

```typescript
// SECURE: Use Supabase's session handler
const { data, error } = await supabase.auth.getSessionFromUrl(url);

// INSECURE: Manual token extraction
const token = url.searchParams.get('access_token'); // ❌
```

### 4.3 Error Handling

- Never expose tokens in error messages
- Log errors server-side only
- Return generic error messages to users
- Validate all inputs before processing

---

## Part 5: Migration Plan

### Phase 1: Setup (Week 1)
- [ ] Configure Google Cloud Console
- [ ] Configure Apple Developer Console
- [ ] Configure Supabase dashboard
- [ ] Install required dependencies
- [ ] Update app.json configuration

### Phase 2: Implementation (Week 2)
- [ ] Implement native Google sign-in
- [ ] Implement native Apple sign-in (iOS)
- [ ] Implement secure OAuth flow (Android/Web)
- [ ] Create secure deep link handler
- [ ] Update auth components

### Phase 3: Testing (Week 3)
- [ ] Test Google sign-in on iOS
- [ ] Test Google sign-in on Android
- [ ] Test Apple sign-in on iOS
- [ ] Test OAuth flow on Android/Web
- [ ] Test error scenarios
- [ ] Security audit of token handling

### Phase 4: Cleanup (Week 4)
- [ ] Remove magic link/OTP code
- [ ] Remove insecure deep link handlers
- [ ] Update documentation
- [ ] Deploy to production

---

## Part 6: Code Examples

### Native Google Sign-In (iOS/Android)

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

// Configure (call once on app start)
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, // iOS only
});

// Sign in
async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    if (userInfo.data?.idToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });
      
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}
```

### Native Apple Sign-In (iOS)

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

async function signInWithApple() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (credential.identityToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: credential.nonce,
      });

      if (error) throw error;
      return data;
    }
  } catch (error) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      // User canceled - handle gracefully
      return;
    }
    throw error;
  }
}
```

### Secure OAuth Flow (Fallback)

```typescript
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

async function signInWithOAuthSecure(provider: 'google' | 'apple') {
  const redirectTo = makeRedirectUri({
    scheme: 'brigo',
    path: 'auth/callback',
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) throw error;

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo,
    { showInRecents: true }
  );

  if (result.type === 'success') {
    // Supabase automatically handles the session from the redirect
    // No need to manually extract tokens!
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData;
  }
}
```

---

## Part 7: Environment Variables

Add to `.env`:

```bash
# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com

# Apple OAuth (if using OAuth flow)
EXPO_PUBLIC_APPLE_SERVICE_ID=com.brigo.ai.web
EXPO_PUBLIC_APPLE_REDIRECT_URI=https://your-project.supabase.co/auth/v1/callback
```

---

## Part 8: Testing Checklist

### Google Sign-In
- [ ] iOS: Native sign-in works
- [ ] Android: Native sign-in works
- [ ] Web: OAuth flow works (if applicable)
- [ ] Error handling (user cancels, network errors)
- [ ] Session persistence after app restart

### Apple Sign-In
- [ ] iOS: Native sign-in works
- [ ] Android: OAuth flow works (if applicable)
- [ ] Web: OAuth flow works (if applicable)
- [ ] First-time user (name/email provided)
- [ ] Returning user (name not provided)
- [ ] Error handling

### Security
- [ ] No tokens in URL history
- [ ] No tokens in logs
- [ ] Secure session storage
- [ ] Proper error messages (no token leakage)
- [ ] Deep links handled securely

---

## Part 9: Troubleshooting

### Common Issues

**Google Sign-In:**
- "DEVELOPER_ERROR": Check SHA-1 fingerprint matches
- "10": Check Client IDs in Supabase dashboard
- Nonce issues: Enable "Skip nonce check" in Supabase

**Apple Sign-In:**
- "Invalid client": Check Services ID matches
- Secret expired: Regenerate client secret (every 6 months)
- Name not provided: Only available on first sign-in

**Deep Links:**
- Not opening app: Check scheme in app.json
- Tokens not working: Use `getSessionFromUrl()` instead of manual extraction

---

## Part 10: Resources

- [Supabase Google Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Apple Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [Supabase Deep Linking Guide](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)

---

## Next Steps

1. **Review this plan** and decide on implementation approach
2. **Set up Google Cloud Console** credentials
3. **Set up Apple Developer Console** credentials
4. **Configure Supabase dashboard** with provider settings
5. **Implement native sign-in** components
6. **Test thoroughly** on all platforms
7. **Remove magic link/OTP** code after OAuth is working
8. **Deploy** to production

---

**Questions or need clarification?** Review the Supabase documentation links above or ask for help with specific implementation steps.

