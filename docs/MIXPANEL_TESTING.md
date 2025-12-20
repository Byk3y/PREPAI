# Mixpanel Integration Testing Guide

## Prerequisites

1. **Rebuild Required**: Mixpanel React Native uses native modules, so you MUST rebuild your app:
   ```bash
   # For iOS
   npx expo run:ios
   
   # For Android
   npx expo run:android
   ```

2. **Environment Variable**: Ensure `EXPO_PUBLIC_MIXPANEL_TOKEN` is set in your `.env` file

3. **Mixpanel Dashboard Access**: Have your Mixpanel project open to view events in real-time

## Testing Steps

### 1. Verify Initialization

**Check Console Logs:**
- Open your app and check the console
- You should see: `[Mixpanel] Initialized successfully`
- If you see errors, check the error message

**In Dev Mode:**
- All tracking calls will log to console with `[Mixpanel] Track:` prefix
- This helps verify events are being called even if Mixpanel isn't fully initialized

### 2. Test User Identification

**Steps:**
1. Log in to your app
2. Check console for: `[Mixpanel] Identify: <user-id>`
3. In Mixpanel dashboard → Users → Search for your user ID
4. Verify user profile exists

**Expected Result:**
- User should be identified in Mixpanel
- User properties should be set (tier, subscription_status, etc.)

### 3. Test Event Tracking

#### A. Trial Reminder Events

**Trigger:**
- Have a trial user with 3 days or less remaining
- Open the home screen

**Expected Events:**
- `trial_reminder_shown` with properties:
  - `days_remaining`: number
  - `tier`: 'trial'
  - `is_expired`: false

**Test Dismiss:**
- Click dismiss on the trial reminder
- Expected: `trial_reminder_dismissed` event

#### B. Upgrade Button Clicks

**Trigger Points:**
1. Click "View Plans" on trial reminder card
2. Click "Upgrade" on limited access banner
3. Click "Upgrade Now" on locked notebook overlay
4. Click "Upgrade to Premium" in upgrade modal
5. Click "Upgrade to Premium" on upgrade screen

**Expected Events:**
- `upgrade_button_clicked` with properties:
  - `source`: 'trial_reminder' | 'limited_access_banner' | 'locked_notebook_overlay' | 'upgrade_modal' | 'upgrade_screen'
  - `tier`: current tier
  - `is_expired`: boolean

#### C. Locked Notebook Access

**Trigger:**
- As a trial user with expired trial
- Try to access a notebook that's not in the limited access list

**Expected Events:**
- `locked_notebook_accessed` with properties:
  - `notebook_id`: string
  - `tier`: 'trial'
  - `is_expired`: true

#### D. Create Attempt Blocked

**Trigger:**
- As expired trial user, try to:
  - Create a new notebook
  - Generate flashcards
  - Generate quiz
  - Generate audio overview

**Expected Events:**
- `create_attempt_blocked` with properties:
  - `content_type`: 'notebook' | 'flashcards' | 'quiz' | 'audio_overview'
  - `tier`: 'trial'
  - `is_expired`: true

#### E. Upgrade Modal Events

**Trigger:**
- Modal appears from various sources (trial expired, create attempt, etc.)

**Expected Events:**
- `upgrade_modal_shown` with `source` property
- `upgrade_modal_dismissed` when user closes modal

#### F. Limited Access Banner

**Trigger:**
- As expired trial user, view home screen

**Expected Events:**
- `limited_access_banner_shown` with tier and is_expired properties

#### G. Upgrade Screen

**Trigger:**
- Navigate to `/upgrade` screen

**Expected Events:**
- `upgrade_screen_viewed` with tier and is_expired properties

### 4. Test User Properties

**Check User Properties in Mixpanel:**
1. Go to Mixpanel Dashboard → Users
2. Search for your user ID
3. Verify properties are set:
   - `tier`: 'trial' | 'premium'
   - `subscription_status`: 'active' | 'canceled' | 'expired'
   - `is_expired`: boolean
   - `trial_days_remaining`: number (only for trial users)
   - `notebooks_count`: number
   - `streak_days`: number

**Test Property Updates:**
1. Create a new notebook → `notebooks_count` should update
2. Update streak → `streak_days` should update
3. Change subscription tier → `tier` and `subscription_status` should update

### 5. Test Super Properties

**Verify:**
- All events should automatically include:
  - `tier`: current tier
  - `is_expired`: boolean

**How to Check:**
- View any event in Mixpanel dashboard
- Check that `tier` and `is_expired` are present in event properties

### 6. Test Logout

**Steps:**
1. Log out of the app
2. Check console for: `[Mixpanel] User cleared`
3. In Mixpanel, verify user data is reset

## Using Mixpanel Dashboard

### Live View
1. Go to Mixpanel Dashboard → Live View
2. Events should appear in real-time as you interact with the app
3. Click on events to see full properties

### Event Explorer
1. Go to Mixpanel Dashboard → Events
2. Search for event names (e.g., `trial_reminder_shown`)
3. View event details and properties

### User Explorer
1. Go to Mixpanel Dashboard → Users
2. Search for your user ID
3. View user profile and all associated events

## Troubleshooting

### Events Not Appearing

1. **Check Console Logs:**
   - Look for `[Mixpanel] Track:` logs in dev mode
   - If you see "not initialized" messages, Mixpanel didn't initialize

2. **Verify Token:**
   - Check `.env` file has `EXPO_PUBLIC_MIXPANEL_TOKEN`
   - Restart dev server after adding token

3. **Check Network:**
   - Mixpanel needs internet connection
   - Events are batched and sent periodically

4. **Rebuild App:**
   - Native modules require rebuild
   - Run `npx expo run:ios` or `npx expo run:android`

### User Not Identified

1. **Check Login Flow:**
   - User identification happens in `useAuthSetup.ts`
   - Verify user is logged in

2. **Check Console:**
   - Look for `[Mixpanel] Identify:` log
   - Check for any errors

### Properties Not Updating

1. **Check Subscription Load:**
   - Properties update when subscription loads
   - Check `subscriptionSlice.ts` for property updates

2. **Debounce Delay:**
   - Notebook count and streak updates are debounced (500ms)
   - Wait a moment after changes

## Testing Checklist

- [ ] App rebuilds successfully
- [ ] Mixpanel initializes (check console)
- [ ] User identification works on login
- [ ] All 9 tracking functions fire events
- [ ] Events appear in Mixpanel Live View
- [ ] Event properties are correct
- [ ] User properties are set correctly
- [ ] Super properties (tier, is_expired) are on all events
- [ ] User data clears on logout
- [ ] No errors in console

## Quick Test Script

Run through this sequence to test all events:

1. **Login** → Check user identification
2. **View Home (trial user, 3 days left)** → `trial_reminder_shown`
3. **Dismiss Reminder** → `trial_reminder_dismissed`
4. **Click View Plans** → `upgrade_button_clicked` (source: 'trial_reminder')
5. **View Upgrade Screen** → `upgrade_screen_viewed`
6. **Go Back, Expire Trial** → `limited_access_banner_shown`
7. **Try to Access Locked Notebook** → `locked_notebook_accessed`
8. **Try to Create Notebook** → `create_attempt_blocked` + `upgrade_modal_shown`
9. **Dismiss Modal** → `upgrade_modal_dismissed`
10. **Logout** → User cleared

## Notes

- **Dev Mode**: Events are logged to console but may not be sent to Mixpanel (depending on configuration)
- **Production**: All events are sent to Mixpanel
- **Batching**: Mixpanel batches events, so they may not appear immediately
- **Rate Limiting**: Mixpanel has rate limits, but normal usage shouldn't hit them



