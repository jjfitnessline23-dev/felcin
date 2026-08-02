import SwiftUI

struct ContentView: View {
    @EnvironmentObject var manager: WorkoutManager

    var body: some View {
        if manager.showingSummary {
            SummaryView()
        } else if manager.isRunning || manager.isPaused {
            WorkoutView()
        } else {
            ActivityPickerView()
        }
    }
}

struct ActivityPickerView: View {
    @EnvironmentObject var manager: WorkoutManager
    @AppStorage("useImperial") var useImperial = false

    private var stepGoal: Int { 10_000 }
    private var stepProgress: Double { min(1.0, Double(manager.dailySteps) / Double(stepGoal)) }
    private var stepColor: Color {
        stepProgress >= 1.0 ? .green : (stepProgress >= 0.5 ? .orange : .yellow)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("Felcin")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding(.bottom, 2)

                // Daily steps card
                VStack(spacing: 6) {
                    HStack {
                        Image(systemName: "figure.walk")
                            .font(.system(size: 13))
                            .foregroundColor(.gray)
                        Text("TODAY'S STEPS")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.gray)
                            .kerning(1)
                        Spacer()
                        if manager.dailySteps >= stepGoal {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.green)
                        }
                    }
                    HStack(alignment: .lastTextBaseline, spacing: 4) {
                        Text(manager.dailySteps == 0 ? "--" : "\(manager.dailySteps.formatted())")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(stepColor)
                        if manager.dailySteps > 0 {
                            Text("/ \(stepGoal.formatted())")
                                .font(.system(size: 12))
                                .foregroundColor(.gray)
                        }
                        Spacer()
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.white.opacity(0.08))
                                .frame(height: 5)
                            RoundedRectangle(cornerRadius: 3)
                                .fill(stepColor)
                                .frame(width: geo.size.width * stepProgress, height: 5)
                        }
                    }
                    .frame(height: 5)
                }
                .padding(12)
                .background(Color.white.opacity(0.06))
                .cornerRadius(12)

                // Activity buttons
                ForEach(ActivityType.allCases, id: \.self) { type in
                    Button(action: { manager.startWorkout(type: type) }) {
                        HStack(spacing: 12) {
                            Image(systemName: type.systemIcon)
                                .font(.system(size: 20))
                                .foregroundColor(iconColor(type))
                                .frame(width: 28)
                            Text(type.rawValue)
                                .font(.headline)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(12)
                    }
                    .buttonStyle(.plain)
                }

                // Unit toggle
                Button(action: { useImperial.toggle() }) {
                    HStack(spacing: 6) {
                        Image(systemName: "ruler")
                            .font(.system(size: 13))
                            .foregroundColor(.gray)
                        Text(useImperial ? "Miles (mi)" : "Kilometers (km)")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    .padding(.vertical, 8)
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
            .padding()
        }
        .onAppear { manager.fetchDailySteps() }
    }

    private func iconColor(_ type: ActivityType) -> Color {
        switch type {
        case .run:   return .green
        case .cycle: return .blue
        case .steps: return .orange
        }
    }
}
