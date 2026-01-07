//
//  WidgetDataManager.swift
//  Brigo
//
//  Manages shared UserDefaults for Widget Extension communication
//  Uses App Group: group.com.brigo.shared
//
//  NOTE: Data models (WidgetData, PetData, etc.) are defined in
//  ios/BrigoWidget/WidgetModels.swift - the single source of truth.
//

import Foundation
import WidgetKit

// MARK: - Widget Data Manager

@objc class WidgetDataManager: NSObject {

    // MARK: - Singleton

    @objc static let shared = WidgetDataManager()

    // MARK: - Constants

    private let appGroupIdentifier = "group.com.brigo.shared"
    private let widgetDataKey = "widgetData"

    // MARK: - Properties

    private var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupIdentifier)
    }

    // MARK: - Initialization

    private override init() {
        super.init()
    }

    // MARK: - Public Methods

    /// Save widget data to shared UserDefaults
    /// - Parameter data: Dictionary containing widget data
    /// - Returns: Success status
    @objc func saveWidgetData(_ data: [String: Any]) -> Bool {
        guard let sharedDefaults = sharedDefaults else {
            print("❌ [WidgetDataManager] Failed to access App Group UserDefaults")
            return false
        }

        // Validate required fields
        guard let streak = data["streak"] as? Int,
              let _ = data["lastStreakDate"] as? String,
              let _ = data["studyStatus"] as? [String: Any],
              let pet = data["pet"] as? [String: Any] else {
            print("❌ [WidgetDataManager] Missing required fields in widget data")
            return false
        }

        // Convert to JSON for storage
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: data, options: [])
            sharedDefaults.set(jsonData, forKey: widgetDataKey)
            sharedDefaults.synchronize()

            print("✅ [WidgetDataManager] Widget data saved successfully")
            print("   Streak: \(streak), Pet: \(pet["name"] ?? "Unknown")")

            return true
        } catch {
            print("❌ [WidgetDataManager] Failed to serialize widget data: \(error)")
            return false
        }
    }

    /// Load widget data from shared UserDefaults
    /// - Returns: WidgetData object or nil if not available
    func loadWidgetData() -> WidgetData? {
        guard let sharedDefaults = sharedDefaults,
              let jsonData = sharedDefaults.data(forKey: widgetDataKey) else {
            print("⚠️ [WidgetDataManager] No widget data found in UserDefaults")
            return nil
        }

        do {
            let decoder = JSONDecoder()
            let widgetData = try decoder.decode(WidgetData.self, from: jsonData)

            print("✅ [WidgetDataManager] Widget data loaded successfully")
            return widgetData
        } catch {
            print("❌ [WidgetDataManager] Failed to decode widget data: \(error)")
            return nil
        }
    }

    /// Reload all widget timelines
    @objc func reloadTimelines() {
        #if canImport(WidgetKit)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
            print("🔄 [WidgetDataManager] Widget timelines reloaded")
        }
        #endif
    }

    /// Get raw widget data as dictionary (for Objective-C bridge)
    /// - Returns: Dictionary or nil
    @objc func getWidgetDataDictionary() -> [String: Any]? {
        guard let sharedDefaults = sharedDefaults,
              let jsonData = sharedDefaults.data(forKey: widgetDataKey) else {
            return nil
        }

        do {
            if let dict = try JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: Any] {
                return dict
            }
        } catch {
            print("❌ [WidgetDataManager] Failed to deserialize widget data: \(error)")
        }

        return nil
    }

    /// Clear all widget data (for testing/debugging)
    @objc func clearWidgetData() {
        guard let sharedDefaults = sharedDefaults else { return }
        sharedDefaults.removeObject(forKey: widgetDataKey)
        sharedDefaults.synchronize()
        print("🗑️ [WidgetDataManager] Widget data cleared")
    }

    /// Check if widget data is valid (not stale)
    /// - Returns: True if data is less than 24 hours old
    @objc func isWidgetDataValid() -> Bool {
        guard let widgetData = loadWidgetData() else {
            return false
        }

        let dateFormatter = ISO8601DateFormatter()
        guard let lastUpdate = dateFormatter.date(from: widgetData.lastUpdate) else {
            return false
        }

        let hoursSinceUpdate = Date().timeIntervalSince(lastUpdate) / 3600
        return hoursSinceUpdate < 24
    }
}
