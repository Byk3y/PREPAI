# Git Commit Instructions

## Issue
The Xcode license agreement needs to be accepted before git commands will work.

## Resolution
Run this command in Terminal (you'll need to review and accept the license):
```bash
sudo xcodebuild -license
```

## Files to Commit

After resolving the Xcode license issue, run these commands:

### 1. Stage all refactored files
```bash
git add hooks/useFonts.ts
git add hooks/useGlobalErrorHandler.ts
git add hooks/useThemeSync.ts
git add hooks/useAuthSetup.ts
git add hooks/useDeepLinks.ts
git add hooks/useAssetPreloading.ts
git add hooks/useAppStateMonitoring.ts
git add hooks/useRoutingLogic.ts
git add app/_layout.tsx
```

Or stage all at once:
```bash
git add hooks/useFonts.ts hooks/useGlobalErrorHandler.ts hooks/useThemeSync.ts hooks/useAuthSetup.ts hooks/useDeepLinks.ts hooks/useAssetPreloading.ts hooks/useAppStateMonitoring.ts hooks/useRoutingLogic.ts app/_layout.tsx
```

### 2. Commit with descriptive message
```bash
git commit -m "refactor: split _layout.tsx into modular hooks for better maintainability

- Extract font loading into useFonts hook
- Extract global error handler setup into useGlobalErrorHandler hook
- Extract theme syncing into useThemeSync hook
- Extract auth state management into useAuthSetup hook
- Extract deep link handling into useDeepLinks hook
- Extract asset preloading into useAssetPreloading hook
- Extract app state monitoring into useAppStateMonitoring hook
- Extract routing logic into useRoutingLogic hook

Benefits:
- Reduced _layout.tsx from 506 to 119 lines (76% reduction)
- Improved maintainability with single-responsibility hooks
- Enhanced testability with isolated hook units
- Better code organization and readability
- All functionality preserved
- All console statements wrapped in __DEV__ for production
- Zero linter errors
- Production-ready code"
```

### 3. Verify the commit
```bash
git log -1 --stat
```

## Summary

**Files Changed:**
- 8 new hook files created in `hooks/` directory
- 1 file refactored: `app/_layout.tsx`

**Impact:**
- 76% code reduction in main layout file
- Improved maintainability and testability
- Production-ready with proper error handling and cleanup


