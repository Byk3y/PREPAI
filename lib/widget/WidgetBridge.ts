/**
 * Widget Bridge Module
 * React Native interface to iOS WidgetKit functionality
 */

import { Platform } from 'react-native';
import type { WidgetBridgeNative, WidgetData } from './types';

// Import the local Expo module
import WidgetBridgeModule from '../../modules/widget-bridge';

// MARK: - Native Module Access

const WidgetBridgeNative = (WidgetBridgeModule || null) as WidgetBridgeNative | null;

// MARK: - Widget Bridge API

/**
 * WidgetBridge - Main API for widget communication
 */
export class WidgetBridge {
  /**
   * Check if widget functionality is available (iOS only)
   */
  static get isAvailable(): boolean {
    return Platform.OS === 'ios' && WidgetBridgeNative?.isWidgetAvailable === true;
  }

  /**
   * Get App Group identifier
   */
  static get appGroupIdentifier(): string {
    return WidgetBridgeNative?.appGroupIdentifier || 'group.com.brigo.shared';
  }

  /**
   * Update widget data
   * Automatically adds timestamp if not provided
   *
   * @param data Widget data object
   * @returns Promise with success status
   *
   * @example
   * ```ts
   * await WidgetBridge.updateWidgetData({
   *   streak: 15,
   *   lastStreakDate: '2026-01-06',
   *   studyStatus: {
   *     securedToday: true,
   *     lastSecureDate: '2026-01-06',
   *     sessionsToday: 2
   *   },
   *   pet: {
   *     name: 'Bubbles',
   *     stage: 2,
   *     isDying: false
   *   }
   * });
   * ```
   */
  static async updateWidgetData(data: Omit<WidgetData, 'lastUpdate'> & { lastUpdate?: string }): Promise<void> {
    if (!this.isAvailable || !WidgetBridgeNative) {
      console.warn('[WidgetBridge] Widget functionality not available on this platform');
      return;
    }

    try {
      // Add timestamp if not provided
      const enrichedData: WidgetData = {
        ...data,
        lastUpdate: data.lastUpdate || new Date().toISOString(),
      };

      const result = await WidgetBridgeNative.updateWidgetData(enrichedData);
      console.log('✅ [WidgetBridge]', result.message);
    } catch (error) {
      console.error('❌ [WidgetBridge] Failed to update widget data:', error);
      throw error;
    }
  }

  /**
   * Get current widget data from shared storage
   *
   * @returns Promise with WidgetData or null if not available
   */
  static async getWidgetData(): Promise<WidgetData | null> {
    if (!this.isAvailable || !WidgetBridgeNative) {
      return null;
    }

    try {
      const data = await WidgetBridgeNative.getWidgetData();
      return data;
    } catch (error) {
      console.error('❌ [WidgetBridge] Failed to get widget data:', error);
      return null;
    }
  }

  /**
   * Manually reload widget timelines
   * Use sparingly - widget updates are debounced to every 5 minutes
   *
   * @returns Promise with success status
   */
  static async reloadTimelines(): Promise<void> {
    if (!this.isAvailable || !WidgetBridgeNative) {
      return;
    }

    try {
      const result = await WidgetBridgeNative.reloadTimelines();
      console.log('🔄 [WidgetBridge]', result.message);
    } catch (error) {
      console.error('❌ [WidgetBridge] Failed to reload timelines:', error);
      throw error;
    }
  }

  /**
   * Check if widget data is valid (not stale)
   * Returns false if data is older than 24 hours
   *
   * @returns Promise with validity status
   */
  static async isDataValid(): Promise<boolean> {
    if (!this.isAvailable || !WidgetBridgeNative) {
      return false;
    }

    try {
      const result = await WidgetBridgeNative.isDataValid();
      return result.isValid;
    } catch (error) {
      console.error('❌ [WidgetBridge] Failed to check data validity:', error);
      return false;
    }
  }

  /**
   * Clear all widget data (for testing/debugging)
   *
   * @returns Promise with success status
   */
  static async clearWidgetData(): Promise<void> {
    if (!this.isAvailable || !WidgetBridgeNative) {
      return;
    }

    try {
      const result = await WidgetBridgeNative.clearWidgetData();
      console.log('🗑️ [WidgetBridge]', result.message);
    } catch (error) {
      console.error('❌ [WidgetBridge] Failed to clear widget data:', error);
      throw error;
    }
  }
}

// MARK: - Exports

export * from './types';
export default WidgetBridge;
