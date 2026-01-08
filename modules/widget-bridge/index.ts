import { requireNativeModule, NativeModulesProxy } from 'expo-modules-core';

// Attempt to load as a modern Expo Module first
let WidgetBridgeModule = null;
try {
    WidgetBridgeModule = requireNativeModule('WidgetBridge');
} catch (e) {
    // Fallback to legacy proxy if not found
    WidgetBridgeModule = NativeModulesProxy.WidgetBridge || null;
}

if (!WidgetBridgeModule) {
    console.warn('[WidgetBridge] Native module WidgetBridge not found in this build');
}

export default WidgetBridgeModule;
