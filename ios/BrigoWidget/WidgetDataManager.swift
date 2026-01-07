//
//  WidgetDataManager.swift
//  BrigoWidget
//
//  Widget-specific data manager for reading shared UserDefaults.
//  This is a read-only version for the widget extension.
//
//  NOTE: The main app uses modules/widget-bridge/ios/WidgetDataManager.swift
//  to WRITE data. This file is for the widget to READ that data.
//

import Foundation
import WidgetKit

// MARK: - Widget Data Manager (Read-Only for Widget Extension)

class WidgetDataManager {

    // MARK: - Singleton

    static let shared = WidgetDataManager()

    // MARK: - Constants

    private let appGroupIdentifier = "group.com.brigo.shared"
    private let widgetDataKey = "widgetData"

    // MARK: - Properties

    private var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupIdentifier)
    }

    // MARK: - Initialization

    private init() {}

    // MARK: - Public Methods

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
}
