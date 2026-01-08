//
//  WidgetModels.swift
//  WidgetBridge
//
//  Shared data models for Widget communication
//

import Foundation

// MARK: - Primary Widget Data Model

/// Widget data structure - shared between React Native app and iOS widget
public struct WidgetData: Codable {
    // Streak tracking
    public let streak: Int
    public let lastStreakDate: String // YYYY-MM-DD format

    // Study status (synced with daily_tasks table)
    public let studyStatus: StudyStatus

    // Pet state
    public let pet: PetData

    // Exam tracking (optional)
    public let nearestExam: ExamData?

    // Recent achievements (optional)
    public let recentMilestone: MilestoneData?

    // Metadata
    public let lastUpdate: String // ISO 8601 timestamp

    // Safety check for stale data (valid for 24 hours)
    public var isValid: Bool {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: lastUpdate) else { return false }
        return abs(date.timeIntervalSinceNow) < 86400
    }

    public static var placeholder: WidgetData {
        WidgetData(
            streak: 0,
            lastStreakDate: "",
            studyStatus: StudyStatus(securedToday: false, lastSecureDate: "", sessionsToday: 0),
            pet: PetData(name: "Buddy", stage: 1, isDying: false),
            nearestExam: nil,
            recentMilestone: nil,
            lastUpdate: ISO8601DateFormatter().string(from: Date())
        )
    }
}

// MARK: - Supporting Models

public struct StudyStatus: Codable {
    public let securedToday: Bool      // secure_pet task completed
    public let lastSecureDate: String  // YYYY-MM-DD
    public let sessionsToday: Int      // Count of completed activities
}

public struct PetData: Codable {
    public let name: String
    public let stage: Int              // 1, 2, or 3
    public let isDying: Bool           // Calculated: !securedToday && streak > 0
}

public struct ExamData: Codable {
    public let title: String           // e.g., "WAEC 2026"
    public let date: String?           // YYYY-MM-DD (optional for widget display)
    public let daysRemaining: Int      // Pre-calculated in RN
}

public struct MilestoneData: Codable {
    public let type: String            // "level_up" | "streak_milestone" | "stage_up"
    public let value: Int              // Stage number or streak count
    public let achievedAt: String      // ISO 8601 timestamp
}
