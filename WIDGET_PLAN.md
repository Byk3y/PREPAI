# 📱 Brigo Widget Implementation Plan (iOS)

## 🎯 Objective
Create a highly engaging, emotionally intelligent home screen widget inspired by the "Duolingo" style. The widget should act as a constant, glanceable companion that drives daily study habits through streak tracking and "emotional urgency" via Brigo and the user's pet.

---

## 🎨 Design Vision: "The Study Buddy"
- **Dual Character System**: Leverages both **Brigo** (the mentor) and the **User's Pet** (the emotional core).
- **Dynamic Context**: Backgrounds, character expressions, and messages change based on:
  - Current streak status.
  - Time of day (Morning/Evening/Deadline).
  - Upcoming exam proximity.
- **Premium Aesthetics**: Glassmorphism, vibrant gradients, and modern typography (SF Pro Rounded or bundled custom fonts).

---

## ⚠️ CRITICAL: Pre-Phase 1 - Asset Optimization
*Complete this BEFORE starting any Xcode work to avoid memory issues.*

### Current State Audit
- **Total Assets**: 1.4MB across 10 files
- **Largest Files**: 208KB (brigo/happy.png, brigo/angry.png)
- **Problem**: 512×512 PNGs will decode to ~1MB each in memory
- **Risk**: Medium Widget has ~30MB budget; 5-6 images = potential crashes

### Required Actions
- [ ] **Create Optimized Asset Catalog**:
  - Create new folder: `assets/widget-optimized/`
  - Generate @1x, @2x, @3x versions for each asset
  - Target resolutions:
    - Brigo: 200×200@1x → 400×400@2x → 600×600@3x
    - Pets: 150×150@1x → 300×300@2x → 450×450@3x
  - **Goal**: All files <100KB (total bundle <2MB)

- [ ] **Image Optimization Commands**:
  ```bash
  # Use ImageOptim or sips (macOS built-in)
  sips -Z 400 brigo/happy.png --out brigo/happy@2x.png
  sips -Z 600 brigo/happy.png --out brigo/happy@3x.png

  # Or use online tool: squoosh.app
  ```

- [ ] **Create Xcode Asset Catalog**:
  - In Widget Extension target: `Assets.xcassets`
  - Drag @2x/@3x PNGs into catalog
  - iOS will auto-select correct resolution

- [ ] **Memory Testing Target**:
  - Profile in Xcode: Product → Profile → Allocations
  - Filter by "WidgetExtension" process
  - **Success Criteria**: Peak memory <20MB for Medium Widget

---

## 🛠 Phase 1: Foundation & Data Bridge
*Setting up the "invisible" infrastructure to share data between React Native and the iOS Widget Extension.*

### Infrastructure Setup
- [ ] **App Group Configuration**:
  - Register `group.com.brigo.shared` in Apple Developer Portal.
  - Enable App Groups in Xcode for both Main App and Widget Extension targets.
  - Verify in `Info.plist` (Expo should auto-configure via `app.json`).

- [ ] **Native Bridge Development**:
  - Create Swift module: `WidgetBridge.swift`
  - Implement TypeScript bindings via React Native bridge
  - Expose methods:
    ```typescript
    interface WidgetBridge {
      updateWidgetData(data: WidgetData): void;
      getWidgetData(): WidgetData | null;
      reloadTimelines(): void; // Calls WidgetCenter.shared.reloadAllTimelines()
    }
    ```

### Enhanced Data Model
- [ ] **Define the `WidgetData` schema** (shared UserDefaults):
  ```typescript
  interface WidgetData {
    // Streak tracking
    streak: number;
    lastStreakDate: string; // YYYY-MM-DD format

    // Study status (synced with daily_tasks table)
    studyStatus: {
      securedToday: boolean;      // secure_pet task completed
      lastSecureDate: string;     // YYYY-MM-DD
      sessionsToday: number;      // Count of completed activities
    };

    // Pet state
    pet: {
      name: string;
      stage: 1 | 2 | 3;
      isDying: boolean;           // Calculated: !securedToday && streak > 0
    };

    // Exam tracking (for "Analytical Brigo" mode)
    nearestExam?: {
      title: string;              // e.g., "WAEC 2026"
      date: string;               // YYYY-MM-DD
      daysRemaining: number;      // Pre-calculated in RN
    };

    // Recent achievements (for celebratory messages)
    recentMilestone?: {
      type: 'level_up' | 'streak_milestone' | 'stage_up';
      value: number;              // Stage number or streak count
      achievedAt: string;         // ISO timestamp
    };

    // Metadata
    lastUpdate: string;           // ISO timestamp (for data staleness checks)
  }
  ```

### React Native Integration Points
- [ ] **Map Update Triggers** (where to call `WidgetBridge.updateWidgetData()`):
  - `lib/store/slices/userSlice.ts`:
    - `setUser()` when streak or last_streak_date changes
  - `lib/store/slices/petSlice.ts`:
    - `setPetState()` when stage, points, or name changes
  - **NEW** - `lib/store/slices/taskSlice.ts` (or wherever daily_tasks are managed):
    - After completing `secure_pet` task
    - Update `studyStatus.securedToday` to true
  - **NEW** - Exam management (wherever exams are created/updated):
    - Calculate `nearestExam` after any exam CRUD operation

- [ ] **Data Validation Layer**:
  ```typescript
  // Add to WidgetBridge helper
  const validateWidgetData = (data: WidgetData): boolean => {
    const now = new Date();
    const lastUpdate = new Date(data.lastUpdate);
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

    // Data is stale if >24 hours old
    return hoursSinceUpdate < 24;
  };
  ```

- [ ] **Widget Reload Strategy**:
  - Call `WidgetBridge.reloadTimelines()` after updating data
  - Debounce rapid updates (max 1 reload per 5 minutes)
  - Use background task to sync data when app enters background

---

## 🎨 Phase 2: Visual Identity & SwiftUI Layouts
*Building the actual UI using optimized assets.*

### Layout Implementation
- [ ] **The "Juice Duo" Layout (Medium Widget)**:
  - Left side: Brigo character with expression (60% width)
  - Right side: Streak counter + pet bubble + message (40% width)
  - Bottom-cropped characters for integrated look
  - Responsive sizing for different widget families

- [ ] **Dynamic Brigo Expression Mapping**:
  - Mood calculation logic **inside SwiftUI view** (not Timeline Provider):
    ```swift
    var brigoMood: BrigoMood {
        // Priority 1: Celebration
        if entry.data.studyStatus.securedToday {
            return .proud  // happy.png
        }

        // Priority 2: Exam countdown (within 7 days)
        if let exam = entry.data.nearestExam, exam.daysRemaining <= 7 {
            return .analytical  // analytical.png
        }

        // Priority 3: Time-based urgency (dynamic!)
        let hour = Calendar.current.component(.hour, from: Date())
        let isDying = entry.data.pet.isDying

        if isDying && hour >= 22 {
            return .angry      // angry.png - Critical deadline
        }
        if isDying && hour >= 18 {
            return .smug       // smug.png - Teasing pressure
        }

        // Default: Encouraging
        return .analytical     // analytical.png
    }
    ```

- [ ] **Thematic Gradient System**:
  - **Fresh Morning (5AM-11AM)**: Linear gradient `[#E0F2FE, #FFFFFF]` (Soft sky blue to white)
  - **Golden Hour (4PM-7PM)**: Linear gradient `[#FDE68A, #FCA5A5]` (Duolingo sunset vibe)
  - **Warning Night (10PM-4AM)**: Linear gradient `[#5B21B6, #DC2626]` (Deep purple to crimson)
  - **Celebration (any time, if studied)**: Radial gradient `[#FBBF24, #F59E0B]` (Warm gold)

- [ ] **Glassmorphism Streak Counter**:
  ```swift
  // Reusable component
  struct GlassStreakBadge: View {
      let streak: Int

      var body: some View {
          ZStack {
              RoundedRectangle(cornerRadius: 16)
                  .fill(.ultraThinMaterial) // iOS 15+ glassmorphism
                  .overlay(
                      RoundedRectangle(cornerRadius: 16)
                          .stroke(Color.white.opacity(0.2), lineWidth: 1)
                  )

              VStack(spacing: 4) {
                  Text("\(streak)")
                      .font(.system(size: 36, weight: .bold, design: .rounded))
                  Text("day streak")
                      .font(.system(size: 12, weight: .medium, design: .rounded))
                      .foregroundColor(.secondary)
              }
          }
      }
  }
  ```

### Typography Strategy
- [ ] **Font Decision**:
  - **Recommended**: Use SF Pro Rounded (built-in, zero bundle size, Apple's "friendly" font)
  - **Alternative**: Bundle Space Grotesk/Outfit fonts
    - Add `.ttf` files to Widget Extension target
    - Update Widget Extension's `Info.plist`:
      ```xml
      <key>UIAppFonts</key>
      <array>
          <string>SpaceGrotesk-Bold.ttf</string>
          <string>Outfit-Medium.ttf</string>
      </array>
      ```

- [ ] **Memory Testing**:
  - After implementing all UI components, profile in Xcode
  - **Target**: Peak memory <20MB
  - If exceeded: Remove one gradient layer or reduce image count

---

## 🧠 Phase 3: Timeline & Logic Controller
*Making the widget "smart" so it changes without opening the app.*

### ⚠️ REVISED STRATEGY - Strategic Snapshots (Not 24-Hour Pre-scheduling)

**Problem with Original Plan:**
- iOS limits ~70 timeline entries max
- System refresh is "best effort" (not guaranteed hourly)
- Pre-scheduling "Smug at 6PM" won't fire if iOS pauses background refresh

**New Approach: Dynamic View Logic + Smart Refresh**

- [ ] **Timeline Provider Implementation**:
  ```swift
  func getTimeline(completion: @escaping (Timeline<Entry>) -> ()) {
      let widgetData = WidgetDataManager.shared.loadData()
      let now = Date()
      let calendar = Calendar.current

      // Calculate next critical time points
      let today = calendar.startOfDay(for: now)
      let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)!

      // Strategic entry times
      var entryDates: [Date] = [now] // Immediate entry

      // Add today's pressure points (if still in future)
      if let today6PM = calendar.date(bySettingHour: 18, minute: 0, second: 0, of: now),
         today6PM > now {
          entryDates.append(today6PM)
      }

      if let today10PM = calendar.date(bySettingHour: 22, minute: 0, second: 0, of: now),
         today10PM > now {
          entryDates.append(today10PM)
      }

      // Add tomorrow's reset point (8AM)
      if let tomorrow8AM = calendar.date(bySettingHour: 8, minute: 0, second: 0, of: tomorrow) {
          entryDates.append(tomorrow8AM)
      }

      // Create entries (same data, different display times)
      let entries = entryDates.map { date in
          SimpleEntry(date: date, data: widgetData)
      }

      // Request refresh at next critical time
      let nextRefresh = entryDates.first(where: { $0 > now }) ?? tomorrow8AM
      let timeline = Timeline(entries: entries, policy: .after(nextRefresh))

      completion(timeline)
  }
  ```

- [ ] **Dynamic Mood Calculation** (see Phase 2 code - logic in VIEW, not timeline)

- [ ] **Contextual Messaging System**:
  ```swift
  func getMessage(for state: WidgetState) -> String {
      let petName = state.data.pet.name

      switch state.mood {
      case .proud:
          return state.data.studyStatus.sessionsToday > 2
              ? "On fire today! 🔥"
              : "Well done, \(petName) is proud!"

      case .analytical:
          if let exam = state.data.nearestExam {
              return "\(exam.daysRemaining) days to \(exam.title)"
          }
          return "Ready for your daily win?"

      case .smug:
          return "Still time to study... 😏"

      case .angry:
          return "SAVE YOUR STREAK!"
      }
  }
  ```

- [ ] **Data Staleness Handling**:
  ```swift
  // In widget view
  if !widgetData.isValid {
      // Show "Open app to sync" message
      Text("Tap to sync")
          .font(.caption)
          .foregroundColor(.secondary)
  }
  ```

### Testing Checklist
- [ ] **Offline Resilience Test**:
  1. Enable Airplane Mode
  2. Close app completely
  3. Wait 6+ hours
  4. Widget should still show correct mood based on time of day
  5. Gradient should match current time period

---

## 🔗 Phase 4: Interactivity & Deep Linking
*Turning the widget into a portal to productivity.*

### URL Scheme Deep Linking (Primary)
- [ ] **Configure Deep Link Routes** (already have `"scheme": "brigo"` in app.json):
  - `brigo://home` → Home screen (default)
  - `brigo://study` → Study/Tasks screen
  - `brigo://pet` → Open pet modal
  - `brigo://notebook/:id` → Specific notebook detail
  - `brigo://exams` → Exam list/calendar

- [ ] **Verify Expo Configuration**:
  ```bash
  # After changes, rebuild native code
  npx expo prebuild --clean

  # Test deep link
  xcrun simctl openurl booted "brigo://study"
  ```

- [ ] **Widget Tap Targets**:
  ```swift
  struct BrigoWidgetEntryView: View {
      var entry: Provider.Entry

      var body: some View {
          ZStack {
              // Entire widget: Open to home
              Link(destination: URL(string: "brigo://home")!) {
                  WidgetContentView(entry: entry)
              }

              // Pet area: Open pet modal (tappable overlay)
              VStack {
                  Spacer()
                  HStack {
                      Spacer()
                      Link(destination: URL(string: "brigo://pet")!) {
                          Color.clear
                              .frame(width: 80, height: 80)
                      }
                  }
              }
          }
      }
  }
  ```

### App Intents (iOS 17+ - Optional)
- [ ] **Evaluate Need for Inline Actions**:
  - Duolingo doesn't use inline widget buttons (just deep links)
  - Only implement if you want "Quick Study" button that completes task WITHOUT opening app
  - **Recommendation**: Skip for MVP, add later if user testing shows demand

- [ ] **(If implementing)** App Intent Example:
  ```swift
  @available(iOS 17.0, *)
  struct QuickStudyIntent: AppIntent {
      static var title: LocalizedStringResource = "Quick Study"
      static var description = IntentDescription("Mark today's study as complete")

      func perform() async throws -> some IntentResult {
          // Update UserDefaults directly
          WidgetDataManager.shared.markStudyComplete()

          // Reload widget
          WidgetCenter.shared.reloadAllTimelines()

          return .result()
      }
  }

  // In widget:
  if #available(iOS 17.0, *) {
      Button(intent: QuickStudyIntent()) {
          Text("Quick Study")
              .font(.caption)
              .padding(8)
              .background(Color.blue)
              .cornerRadius(8)
      }
      .buttonStyle(.plain)
  }
  ```

---

## 🚀 Phase 5: Refinement & Data Integrity
*Final polish and production hardening.*

### Advanced Features
- [ ] **Lock Screen Widgets** (iOS 16+):
  - Create circular Lock Screen widget family
  - Show only: Streak number + small pet indicator
  - Minimal design (no gradients, no images - just SF Symbols)

- [ ] **Micro-animations**:
  - Use `.contentTransition(.numericText())` for streak counter updates
  - Subtle scale animation on pet state change
  - **Limit**: WidgetKit doesn't support continuous animations (only between timeline entries)

- [ ] **Accessibility (VoiceOver)**:
  ```swift
  Image("brigo-happy")
      .accessibilityLabel("Brigo is proud of your \(streak)-day streak")

  Text("\(petName)")
      .accessibilityLabel("\(petName) is \(isDying ? "at risk" : "happy and healthy")")
  ```

### Data Integrity & Error Handling
- [ ] **Widget Data Validation**:
  ```swift
  extension WidgetData {
      var isValid: Bool {
          let now = Date()
          guard let lastUpdate = ISO8601DateFormatter().date(from: self.lastUpdate) else {
              return false
          }

          // Data is stale if >24 hours old
          let hoursSinceUpdate = now.timeIntervalSince(lastUpdate) / 3600
          return hoursSinceUpdate < 24
      }
  }
  ```

- [ ] **Corrupted Data Recovery**:
  ```swift
  // In TimelineProvider
  guard let widgetData = WidgetDataManager.shared.loadData(),
        widgetData.isValid else {
      // Return placeholder entry
      let placeholder = WidgetData.placeholder
      let entry = SimpleEntry(date: Date(), data: placeholder)
      completion(Timeline(entries: [entry], policy: .never))
      return
  }
  ```

- [ ] **Placeholder State** (shown in widget gallery):
  ```swift
  static var placeholder: WidgetData {
      WidgetData(
          streak: 7,
          lastStreakDate: "2026-01-06",
          studyStatus: StudyStatus(securedToday: true, lastSecureDate: "2026-01-06", sessionsToday: 1),
          pet: PetData(name: "Bubbles", stage: 2, isDying: false),
          nearestExam: nil,
          recentMilestone: nil,
          lastUpdate: ISO8601DateFormatter().string(from: Date())
      )
  }
  ```

- [ ] **Battery Optimization Verification**:
  - Profile widget in Instruments: Product → Profile → Energy Log
  - **Target**: Widget shouldn't trigger CPU usage when not visible
  - **Success Criteria**: No background processing (timeline updates only)

---

## 📂 Asset Manifest

### Current Assets (Pre-Optimization)
- `assets/widget/brigo/`: happy (208KB), angry (206KB), smug (122KB), proud (147KB), analytical (147KB)
- `assets/widget/pets/`:
  - Stage 1: bubble (11KB), dying (113KB)
  - Stage 2: bubble (112KB), dying (168KB)
  - Stage 3: bubble (132KB), dying (missing - needs creation)
- **Total**: ~1.4MB

### Required Optimized Assets (Phase 0)
- `assets/widget-optimized/` (all files <100KB target)
- Asset Catalog in Xcode: `WidgetExtension/Assets.xcassets`
- **Missing Asset**: Create `stage-3/dying.png` before starting Phase 2

---

## 🔧 Technical Stack

### Libraries & Tools
- **No 3rd-party libraries needed** - Pure WidgetKit + SwiftUI
- ~~`react-native-widget-extension`~~ (Not needed - use Expo's config plugin system)
- Use Expo's `expo-build-properties` for native configuration if needed

### Development Environment
- **Xcode 15+** (for iOS 17 support)
- **iOS Deployment Target**: 16.0 (for Lock Screen widgets)
- **Testing**: iOS Simulator + Physical device (widgets behave differently on device)

### Code Organization
```
ios/
├── BrigoWidget/                    # Widget Extension target
│   ├── BrigoWidget.swift           # Main widget definition
│   ├── BrigoWidgetBundle.swift     # Widget bundle (supports multiple sizes)
│   ├── TimelineProvider.swift      # Timeline management
│   ├── WidgetDataManager.swift     # UserDefaults manager
│   ├── Views/
│   │   ├── BrigoWidgetView.swift   # Main widget UI
│   │   ├── GlassStreakBadge.swift  # Reusable components
│   │   └── GradientBackground.swift
│   ├── Models/
│   │   └── WidgetData.swift        # Data model (mirrors TypeScript)
│   └── Assets.xcassets             # Optimized images
│
└── BrigoBridge/                    # React Native bridge
    ├── WidgetBridge.swift          # Swift bridge
    └── WidgetBridge.m              # Objective-C bridge header
```

---

## 📋 Implementation Checklist (Revised Order)

### ✅ Phase 0: Asset Optimization (2-3 hours)
- [ ] Audit current asset sizes and memory footprint
- [ ] Create `assets/widget-optimized/` with @2x/@3x versions
- [ ] Compress all PNGs to <100KB each
- [ ] Create missing `stage-3/dying.png` asset
- [ ] Set up Xcode Asset Catalog

### ✅ Phase 1: Infrastructure (2-3 days)
- [ ] Configure App Group `group.com.brigo.shared`
- [ ] Implement `WidgetBridge` Swift module
- [ ] Create TypeScript bindings for React Native
- [ ] Define enhanced `WidgetData` schema (with exam tracking, study status)
- [ ] Map all widget update trigger points in React Native store
- [ ] Add debounced reload mechanism
- [ ] Test data sync: RN → UserDefaults → Widget

### ✅ Phase 2: Visual UI (2-3 days)
- [ ] Create Widget Extension target in Xcode
- [ ] Import optimized assets into Asset Catalog
- [ ] Implement "Juice Duo" layout (Medium Widget)
- [ ] Build dynamic Brigo mood calculation (in view, not timeline)
- [ ] Create thematic gradient system (time-based)
- [ ] Implement glassmorphism streak counter
- [ ] Add contextual messaging system
- [ ] Memory profile: Ensure <20MB peak

### ✅ Phase 3: Timeline Logic (1 day)
- [ ] Implement strategic snapshot Timeline Provider (3-4 entries)
- [ ] Use `.after()` policy for next critical time
- [ ] Add data staleness validation
- [ ] Create placeholder state for widget gallery
- [ ] **Test**: Offline mode + time-based mood transitions

### ✅ Phase 4: Deep Linking (1 day)
- [ ] Configure URL scheme routes (brigo://study, brigo://pet, etc.)
- [ ] Verify Expo's scheme configuration
- [ ] Implement widget tap targets (whole widget + pet overlay)
- [ ] Test deep links in Simulator and device
- [ ] (Optional) Evaluate App Intents for iOS 17+

### ✅ Phase 5: Production Hardening (1-2 days)
- [ ] Add VoiceOver accessibility labels
- [ ] Implement Lock Screen widget variant
- [ ] Add subtle content transition animations
- [ ] Battery profiling (Energy Log instrument)
- [ ] Create comprehensive error handling
- [ ] Widget data corruption recovery
- [ ] Final QA: Test all mood states, time periods, edge cases

---

## 🎯 Success Criteria

### User Experience
- [ ] Widget updates within 5 seconds after completing study task in app
- [ ] Mood transitions feel natural and timely (not jarring)
- [ ] Streak counter is always accurate (no stale data shown)
- [ ] Tapping pet opens app to pet modal (not generic home screen)
- [ ] Widget is visually consistent with main app's design language

### Technical Performance
- [ ] Peak memory usage <20MB (Medium Widget)
- [ ] Widget extension binary size <5MB
- [ ] No CPU usage when widget is not visible
- [ ] Data sync reliability: 99%+ (widget shows correct data)
- [ ] Works offline: Widget displays last known state gracefully

### Edge Cases Handled
- [ ] User hasn't opened app in 7+ days (shows "Tap to sync" message)
- [ ] Corrupted UserDefaults data (shows placeholder, doesn't crash)
- [ ] Rapid state changes (debounced updates, no flickering)
- [ ] Timezone changes (dates calculated correctly)
- [ ] Background refresh disabled (widget still functions with stale data)

---

## 🚨 Known Limitations & Tradeoffs

1. **Timeline Refresh is "Best Effort"**:
   - iOS doesn't guarantee hourly updates
   - Users may see outdated mood if background refresh is paused
   - Mitigation: Dynamic view logic + strategic snapshot times

2. **Memory Budget Constraints**:
   - Can't use animated GIFs or videos
   - Gradient complexity limited to 2-3 stops
   - Image count capped at ~6 simultaneous

3. **No Real-Time Updates**:
   - Widget won't update instantly when studying (requires opening app first)
   - Mitigation: Call `WidgetCenter.reloadTimelines()` immediately after task completion

4. **Exam Data Dependency**:
   - Widget needs exam dates from main app
   - If exam feature isn't fully implemented in RN, skip `nearestExam` for MVP

---

## 📖 Resources

- [Apple WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [SwiftUI Widget Tutorial](https://developer.apple.com/tutorials/swiftui/creating-a-widget-extension)
- [App Groups Setup Guide](https://developer.apple.com/documentation/xcode/configuring-app-groups)
- [Widget Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/widgets)

---

**Last Updated**: 2026-01-06 (Post-Architectural Review)
**Estimated Timeline**: 1-1.5 weeks for production-ready implementation
**Total Bundle Size Target**: <10MB (widget extension + assets)
