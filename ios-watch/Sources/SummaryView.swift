import SwiftUI

struct SummaryView: View {
    @EnvironmentObject var manager: WorkoutManager

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 30)).foregroundColor(.green)
                Text(title)
                    .font(.headline).foregroundColor(.white)
                Divider()

                switch manager.activityType {
                case .run:
                    row("Distance", String(format: "%.2f km", manager.distance / 1000))
                    row("Time",     elapsed)
                    row("Avg Pace", pace)
                    row("Calories", "\(Int(manager.calories)) cal")
                    row("Heart Rate", hr)
                case .cycle:
                    row("Distance", String(format: "%.2f km", manager.distance / 1000))
                    row("Time",     elapsed)
                    row("Avg Speed", manager.speed > 0 ? String(format: "%.1f km/h", manager.speed * 3.6) : "--")
                    row("Calories", "\(Int(manager.calories)) cal")
                    row("Heart Rate", hr)
                case .steps:
                    row("Steps",    "\(manager.stepCount)")
                    row("Distance", String(format: "%.2f km", manager.distance / 1000))
                    row("Time",     elapsed)
                    row("Calories", "\(Int(manager.calories)) cal")
                    row("Heart Rate", hr)
                }

                Button(action: manager.resetWorkout) {
                    Text("Done")
                        .font(.headline).foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.green).cornerRadius(8)
                }
                .buttonStyle(.plain)
                .padding(.top, 6)
            }
            .padding()
        }
    }

    private var title: String {
        switch manager.activityType {
        case .run:   return "Run Complete"
        case .cycle: return "Ride Complete"
        case .steps: return "Walk Complete"
        }
    }
    private var hr: String { manager.heartRate > 0 ? "\(Int(manager.heartRate)) bpm" : "--" }
    private var elapsed: String {
        let t = Int(manager.elapsedTime)
        let h = t / 3600, m = (t % 3600) / 60, s = t % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
    }
    private var pace: String {
        guard manager.pace > 0 else { return "--'--\"/km" }
        let m = Int(manager.pace) / 60, s = Int(manager.pace) % 60
        return String(format: "%d'%02d\"/km", m, s)
    }
    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.caption).foregroundColor(.gray)
            Spacer()
            Text(value).font(.caption).fontWeight(.semibold).foregroundColor(.white)
        }
    }
}