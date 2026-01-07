import ExpoModulesCore
import WidgetKit

public class WidgetBridgeModule: Module {
  // Define module name
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    // Export constants
    Constants([
      "appGroupIdentifier": "group.com.brigo.shared",
      "isWidgetAvailable": true
    ])

    // Async function to update widget data
    AsyncFunction("updateWidgetData") { (data: [String: Any], promise: Promise) in
      // Add timestamp if not provided
      var enrichedData = data
      if enrichedData["lastUpdate"] == nil {
        let timestamp = ISO8601DateFormatter().string(from: Date())
        enrichedData["lastUpdate"] = timestamp
      }

      // Save data using WidgetDataManager
      let success = WidgetDataManager.shared.saveWidgetData(enrichedData)

      if success {
        // Reload timelines
        WidgetDataManager.shared.reloadTimelines()
        promise.resolve([
          "success": true,
          "message": "Widget data updated successfully"
        ])
      } else {
        promise.reject("UPDATE_FAILED", "Failed to update widget data")
      }
    }

    // Async function to get widget data
    AsyncFunction("getWidgetData") { (promise: Promise) in
      if let data = WidgetDataManager.shared.getWidgetDataDictionary() {
        promise.resolve(data)
      } else {
        promise.resolve(nil)
      }
    }

    // Async function to reload timelines
    AsyncFunction("reloadTimelines") { (promise: Promise) in
      WidgetDataManager.shared.reloadTimelines()
      promise.resolve([
        "success": true,
        "message": "Widget timelines reloaded"
      ])
    }

    // Async function to check data validity
    AsyncFunction("isDataValid") { (promise: Promise) in
      let isValid = WidgetDataManager.shared.isWidgetDataValid()
      promise.resolve([
        "isValid": isValid
      ])
    }

    // Async function to clear widget data
    AsyncFunction("clearWidgetData") { (promise: Promise) in
      WidgetDataManager.shared.clearWidgetData()
      WidgetDataManager.shared.reloadTimelines()
      promise.resolve([
        "success": true,
        "message": "Widget data cleared"
      ])
    }
  }
}
