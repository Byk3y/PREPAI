//
//  BrigoWidget.swift
//  BrigoWidget
//
//  Duolingo-inspired Study Companion Widget
//  Square design with gradient, streak, and pet mascot
//

import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), data: WidgetData.placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), data: WidgetData.placeholder)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        // Load data from shared UserDefaults
        guard let widgetData = WidgetDataManager.shared.loadWidgetData(),
              widgetData.isValid else {
            // Return placeholder entry if no valid data
            let entry = SimpleEntry(date: Date(), data: WidgetData.placeholder)
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(3600)))
            completion(timeline)
            return
        }

        let now = Date()
        let entry = SimpleEntry(date: now, data: widgetData)
        
        // Refresh every hour or at next critical time
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 1, to: now) ?? now
        let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
        
        completion(timeline)
    }
}

// MARK: - Timeline Entry

struct SimpleEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

// MARK: - Widget Entry View (Duolingo Style)

struct BrigoWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    // Contextual message based on state
    var message: String {
        let hour = Calendar.current.component(.hour, from: entry.date)
        
        if entry.data.studyStatus.securedToday {
            return "Nice work! 🎉"
        }
        
        if hour < 12 {
            return "Morning study?"
        } else if hour < 17 {
            return "Quick session?"
        } else if hour < 21 {
            return "Evening grind?"
        } else {
            return "Save your streak!"
        }
    }
    
    // Pet image name based on stage and state
    var petImageName: String {
        let stage = entry.data.pet.stage
        let isDying = entry.data.pet.isDying
        return "pet-stage\(stage)-\(isDying ? "dying" : "bubble")"
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Gradient background (Duolingo-style warm gradient)
                LinearGradient(
                    colors: [
                        Color(hex: "#FFB347"), // Warm orange
                        Color(hex: "#FF6B6B")  // Coral pink
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                VStack(spacing: 4) {
                    // Streak counter at top
                    HStack(spacing: 6) {
                        // Flame icon
                        Image(systemName: "flame.fill")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.white.opacity(0.9))
                        
                        // Streak number
                        Text("\(entry.data.streak)")
                            .font(.system(size: 42, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                    }
                    .padding(.top, 12)
                    
                    // Contextual message
                    Text(message)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundColor(.white.opacity(0.95))
                        .multilineTextAlignment(.center)
                    
                    Spacer()
                    
                    // Pet at bottom (peeking up from edge)
                    Image(petImageName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: geometry.size.width * 0.7, height: geometry.size.height * 0.5)
                        .offset(y: geometry.size.height * 0.1) // Peek from bottom
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
}

// MARK: - Widget Configuration

struct BrigoWidget: Widget {
    let kind: String = "BrigoWidget"

    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return StaticConfiguration(kind: kind, provider: Provider()) { entry in
                BrigoWidgetEntryView(entry: entry)
                    .containerBackground(for: .widget) {
                        Color.clear
                    }
            }
            .configurationDisplayName("Brigo")
            .description("Track your study streak!")
            .supportedFamilies([.systemSmall]) // Square widget only
        } else {
            return StaticConfiguration(kind: kind, provider: Provider()) { entry in
                BrigoWidgetEntryView(entry: entry)
            }
            .configurationDisplayName("Brigo")
            .description("Track your study streak!")
            .supportedFamilies([.systemSmall]) // Square widget only
        }
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 255, 255, 255)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Preview

@available(iOS 17.0, *)
#Preview(as: .systemSmall) {
    BrigoWidget()
} timeline: {
    SimpleEntry(date: .now, data: .placeholder)
}
