//
//  WidgetModels.swift
//  BrigoWidget
//
//  Single source of truth for all widget data models.
//  This file should be included in BOTH App and Widget targets.
//

import Foundation

// MARK: - Primary Widget Data Model

/// Widget data structure - shared between React Native app and iOS widget
struct WidgetData: Codable {
    // Streak tracking
    let streak: Int
    let lastStreakDate: String // YYYY-MM-DD format

    // Study status (synced with daily_tasks table)
    let studyStatus: StudyStatus

    // Pet state
    let pet: PetData

    // Exam tracking (optional)
    let nearestExam: ExamData?

    // Recent achievements (optional)
    let recentMilestone: MilestoneData?

    // Metadata
    let lastUpdate: String // ISO 8601 timestamp

    // Safety check for stale data (valid for 24 hours)
    var isValid: Bool {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: lastUpdate) else { return false }
        return abs(date.timeIntervalSinceNow) < 86400
    }

    static var placeholder: WidgetData {
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

struct StudyStatus: Codable {
    let securedToday: Bool      // secure_pet task completed
    let lastSecureDate: String  // YYYY-MM-DD
    let sessionsToday: Int      // Count of completed activities
}

struct PetData: Codable {
    let name: String
    let stage: Int              // 1, 2, or 3
    let isDying: Bool           // Calculated: !securedToday && streak > 0
}

struct ExamData: Codable {
    let title: String           // e.g., "WAEC 2026"
    let date: String?           // YYYY-MM-DD (optional for widget display)
    let daysRemaining: Int      // Pre-calculated in RN
}

struct MilestoneData: Codable {
    let type: String            // "level_up" | "streak_milestone" | "stage_up"
    let value: Int              // Stage number or streak count
    let achievedAt: String      // ISO 8601 timestamp
}
