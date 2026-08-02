import SwiftUI

struct SummaryView: View {
    @EnvironmentObject var manager: WorkoutManager
    @AppStorage("useImperial") var useImperial = false

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
                    row("Distance", distanceString)
                    row("Time",     elapsed)
                    row("Avg Pace", pace)
                    row("Calories", manager.calories > 0 ? "\(Int(manager.calories)) cal" : "--")
                    row("Heart Rate", hr)
                case .cycle:
                    row("Distance", distanceString)
                    row("Time",     elapsed)
                    row("Avg Speed", speedString)
                    row("Calories", manager.calories > 0 ? "\(Int(manager.calories)) cal" : "--")
                    row("Heart Rate", hr)
                case .steps:
                    row("Steps",    "\(manager.stepCount)")
                    row("Distance", distanceString)
                    row("Time",     elapsed)
                    row("Calories", manager.calories > 0 ? "\(Int(manager.calories)) cal" : "--")
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

    private var distanceString: String {
        let val = useImperial ? manager.distance / 1609.34 : manager.distance / 1000
        let unit = useImperial ? "mi" : "km"
        return String(format: "%.2f %@", val, unit)
    }

    private var speedString: String {
        guard manager.speed > 0 else { return "--" }
        return useImperial
            ? String(format: "%.1f mph", manager.speed * 2.23694)
            : String(format: "%.1f km/h", manager.speed * 3.6)
    }

    private var hr: String { manager.heartRate > 0 ? "\(Int(manager.heartRate)) bpm" : "--" }

    private var elapsed: String {
        let t = Int(manager.elapsedTime)
        let h = t / 3600, m = (t % 3600) / 60, s = t % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
    }

    private var pace: String {
        guard manager.pace > 0 else { return "--" }
        let paceSeconds = useImperial ? manager.pace * 1.60934 : manager.pace
        let m = Int(paceSeconds) / 60, s = Int(paceSeconds) % 60
        let unit = useImperial ? "/mi" : "/km"
        return String(format: "%d'%02d\"%@", m, s, unit)
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.caption).foregroundColor(.gray)
            Spacer()
            Text(value).font(.caption).fontWeight(.semibold).foregroundColor(.white)
        }
    }
}
