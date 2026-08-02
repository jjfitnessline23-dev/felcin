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

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("Felcin")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding(.bottom, 2)

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
    }

    private func iconColor(_ type: ActivityType) -> Color {
        switch type {
        case .run:   return .green
        case .cycle: return .blue
        case .steps: return .orange
        }
    }
}
