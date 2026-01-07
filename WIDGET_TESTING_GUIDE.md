# 📱 Brigo Widget Testing Guide

## ✅ Setup Complete!

All widget infrastructure is now in place:
- ✅ Native Swift bridge
- ✅ TypeScript integration
- ✅ Widget UI components
- ✅ Optimized assets in Xcode
- ✅ Test screen added to app

---

## 🧪 How to Test the Widget

### Step 1: Access the Test Screen

1. **Launch the app** on your iPhone
2. Navigate to: **Settings** (⚙️ icon)
3. Scroll down to **"Widget Test"** under the SUPPORT section
4. Tap to open the test screen

### Step 2: Send Test Data

On the Widget Test screen:

1. **Tap "Send Placeholder Data"**
   - This sends sample widget data to iOS
   - Status should show "Placeholder data sent!"

2. **Verify the data** (optional)
   - Tap "Get Widget Data" to see what's stored
   - Should show streak: 7, pet: "Bubbles", etc.

### Step 3: Add Widget to Home Screen

1. **Go to your iPhone Home Screen**
2. **Long press** on empty space until apps jiggle
3. **Tap the + button** in the top-left corner
4. **Search for "Brigo"**
5. **Select "Brigo Study Companion"**
6. **Choose "Medium" size** (recommended)
7. **Tap "Add Widget"**
8. **Tap "Done"**

### Step 4: Verify Widget Displays

The widget should show:
- **Left side**: Brigo character (should be "analytical" mood)
- **Right side**:
  - Streak counter (7 days)
  - Pet bubble with name "Bubbles"
  - Message: "Ready for your daily win?"

---

## 🎨 Testing Different Widget States

### Test Happy Brigo (Studied Today)

1. In your app, complete the "Secure Pet" task
2. Go to Settings > Widget Test
3. Tap "Update from Store"
4. Check widget - Brigo should be happy! 😊

### Test Angry Brigo (Late at Night, Not Studied)

1. Don't complete any tasks
2. Change iPhone time to 10:30 PM (Settings > General > Date & Time)
3. Go to Settings > Widget Test
4. Tap "Force Reload Widget"
5. Widget should show angry Brigo 😡

### Test Smug Brigo (Evening, Not Studied)

1. Don't complete any tasks
2. Change iPhone time to 6:30 PM
3. Reload widget
4. Widget should show smug Brigo 😏

### Test Different Pet Stages

1. Change your pet's stage in the app
2. Go to Settings > Widget Test
3. Tap "Update from Store"
4. Widget should reflect new pet stage

---

## 🔧 Troubleshooting

### Widget Not Showing Up

- Make sure you built with: `npx expo run:ios` (NOT Expo Go)
- Widgets don't work in Expo Go - need native build
- Check Xcode for build errors

### Widget Shows "No Data"

- Tap "Send Placeholder Data" in Widget Test screen
- Wait 5-10 seconds, then check home screen
- Try "Force Reload Widget"

### Widget Not Updating

- iOS caches widgets - updates may take 5-30 seconds
- Tap "Force Reload Widget" in test screen
- Remove and re-add the widget to force refresh

### Images Not Showing

- Check: `ios/BrigoWidget/Assets.xcassets/`
- Should have folders like `brigo-happy.imageset`
- Re-run: `bash scripts/setup-widget-assets.sh`

---

## 📊 Widget Data Flow

```
React Native App
      ↓
WidgetBridge.updateWidgetData()
      ↓
Swift WidgetDataManager
      ↓
UserDefaults (App Group)
      ↓
Widget Extension Reads Data
      ↓
Widget UI Displays
```

---

## 🚀 Next Steps (Production Integration)

Once testing is successful, integrate into your app:

### 1. Add to User Slice

```typescript
// lib/store/slices/userSlice.ts
import { WidgetBridge, buildWidgetData } from '@/lib/widget';

setUser: (updates) => {
  set((state) => ({ user: { ...state.user, ...updates } }));

  // Update widget when streak changes
  if (updates.streak !== undefined) {
    updateWidgetFromStore();
  }
}
```

### 2. Add to Task Completion

```typescript
// When user completes secure_pet task
await markTaskComplete('secure_pet');
await updateWidgetFromStore();
```

### 3. Add to App Launch

```typescript
// app/_layout.tsx
useEffect(() => {
  updateWidgetFromStore();
}, []);
```

---

## 📱 Widget Refresh Timing

The widget auto-refreshes at:
- **6:00 PM** - Golden hour gradient, gentle reminder
- **10:00 PM** - Warning gradient, urgent reminder
- **8:00 AM (next day)** - Reset for new day

Between these times, you can manually trigger with:
```typescript
await WidgetBridge.reloadTimelines();
```

---

## 🎯 Success Criteria

- ✅ Widget appears in widget gallery
- ✅ Shows correct Brigo mood based on state
- ✅ Displays accurate streak count
- ✅ Shows pet name and stage
- ✅ Updates within 10 seconds of data change
- ✅ Time-based gradients change correctly
- ✅ Tapping widget opens app (deep link)

---

## 📝 Available Test Actions

In the Widget Test screen:

| Button | Action |
|--------|--------|
| **Update from Store** | Syncs current app data to widget |
| **Send Placeholder Data** | Sends sample data (for testing) |
| **Get Widget Data** | Retrieves current widget data |
| **Force Reload Widget** | Manually triggers widget refresh |
| **Check Data Validity** | Verifies data isn't stale (>24h) |
| **Clear All Data** | Resets widget data |

---

## 🐛 Known Limitations

1. **Widget updates are "best effort"** - iOS controls timing
2. **5-minute debounce** on reload - prevents spamming
3. **No real-time animations** - only static updates
4. **Medium size only** - can add Small/Large later
5. **iOS 16+** required for Lock Screen widgets (future)

---

## 📖 Resources

- Test Screen: `app/widget-test.tsx`
- Widget Code: `ios/BrigoWidget/BrigoWidget.swift`
- Bridge Code: `lib/widget/WidgetBridge.ts`
- Assets Script: `scripts/setup-widget-assets.sh`
- Full Plan: `WIDGET_PLAN.md`

---

**Happy Testing! 🎉**

If you encounter any issues, check Xcode console logs for detailed error messages.
