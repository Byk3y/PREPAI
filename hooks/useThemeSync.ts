/**
 * Hook for syncing ThemeContext with NativeWind color scheme
 * Ensures components using dark: classes work correctly
 */

import { useEffect } from 'react';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useTheme } from '@/lib/ThemeContext';

export function useThemeSync() {
  const { effectiveColorScheme } = useTheme();
  const { setColorScheme, colorScheme } = useNativeWindColorScheme();
  
  useEffect(() => {
    // Sync NativeWind with our theme context (for components using dark: classes)
    if (colorScheme !== effectiveColorScheme) {
      setColorScheme(effectiveColorScheme);
    }
  }, [effectiveColorScheme, colorScheme, setColorScheme]);
}
