/**
 * MotiView Compatibility Wrapper
 * Falls back to regular View if MotiView fails (for Expo Go compatibility)
 */

import React from 'react';
import { View, ViewProps } from 'react-native';

// Try to import MotiView, but fallback to View if it fails
let MotiViewComponent: any = View;

try {
  const moti = require('moti');
  if (moti && moti.MotiView) {
    MotiViewComponent = moti.MotiView;
  }
} catch (error) {
  // If moti fails to load, use regular View
  console.warn('MotiView not available, using regular View');
}

interface MotiViewCompatProps extends ViewProps {
  from?: any;
  animate?: any;
  transition?: any;
  [key: string]: any;
}

export const MotiViewCompat: React.FC<MotiViewCompatProps> = (props) => {
  const { from, animate, transition, ...viewProps } = props;
  
  // If MotiView is available, use it
  if (MotiViewComponent !== View) {
    return <MotiViewComponent {...props} />;
  }
  
  // Otherwise, just use regular View (animations won't work but app won't crash)
  return <View {...viewProps} />;
};




