import SwiftUI

struct SummaryView: View {
    @EnvironmentObject var manager: WorkoutManager
    @AppStorage("useImperial") var useImperial = false

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {

                // PR banner — appears as soon as API responds
                if manager.isDistancePR || manager.isPacePR {
                    HStack(spacing: 8) {
                        Image(systemName: "trophy.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.yellow)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("New Personal Record!")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.yellow)
                            Text(prSubtitle)
                                .font(.system(size: 10))
                                .foregroundColor(Color.yellow.opacity(0.7))
                        }
                        Spacer()
                    }
                    .padding(10)
                    .background(Color.yellow.opacity(0.15))
                    .cornerRadius(10)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.yellow.opacity(0.4), lineWidth: 1))
                }

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 30)).foregroundColor(.green)
                Text(title)
                    .font(.headline).foregroundColor(.white)
                Divider()

                switch manager.activityType {
                case .run:
                    row("Distance",   distanceString)
                    row("Time",       elapsed)
                    row("Avg Pace",   pace)
                    row("Calories",   manager.calories > 0 ? "\(Int(manager.calories)) cal" : "--")
                    row("Heart Rate", hr)
                case .cycle:
                    row("Distance",   distanceString)
                    row("Time",       elapsed)
                    row("Avg Speed",  speedString)
                    row("Calories",   manager.calories > 0 ? "\(Int(manager.calories)) cal" : "--")
                    row("Heart Rate", hr)
                case .steps:
                    row("Steps",      "\(manager.stepCount)")
                    row("Distance",   distanceString)
                    row("Time",       elapsed)
                    row("Calories",   manager.calories > 0 ? "\(Int(manager.calories)) cal" : "--")
                    row("Heart Rate", hr)
                }

                // Sync status row
                syncStatusView

                Button(action: manager.resetWorkout) {
                    Text("Done")
                        .font(.headline).foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(manager.isSyncing ? Color.gray : Color.green)
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
                .disabled(manager.isSyncing)
                .padding(.top, 6)
            }
            .padding()
        }
    }

    @ViewBuilder
    private var syncStatusView: some View {
        if manager.isSyncing {
            HStack(spacing: 6) {
                ProgressView().scaleEffect(0.7)
                Text("Saving to Felcin…")
                    .font(.caption).foregroundColor(.gray)
            }
            .padding(.top, 4)
        } else if manager.noUID {
            VStack(spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: "iphone.and.arrow.forward")
                        .font(.caption).foregroundColor(.orange)
                    Text("Open Felcin on iPhone to sync")
                        .font(.caption).foregroundColor(.orange)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Button(action: { manager.syncToFelcin() }) {
                    Text("Retry Sync")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.orange)
                        .padding(.horizontal, 12).padding(.vertical, 4)
                        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.orange.opacity(0.5), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
            .padding(.top, 4)
        } else if let err = manager.syncError {
            HStack(spacing: 6) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.caption).foregroundColor(.red)
                Text(err)
                    .font(.caption).foregroundColor(.red)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.top, 4)
        } else if manager.syncSaved {
            HStack(spacing: 4) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.caption).foregroundColor(.green)
                Text("Saved to Felcin")
                    .font(.caption).foregroundColor(.gray)
            }
            .padding(.top, 4)
        }
    }

    private var prSubtitle: String {
        [manager.isDistancePR ? "Best distance" : nil,
         manager.isPacePR ? (manager.activityType == .cycle ? "Best speed" : "Best pace") : nil]
            .compactMap { $0 }.joined(separator: " · ")
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
        return String(format: "%.2f %@", val, useImperial ? "mi" : "km")
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
        let p = useImperial ? manager.pace * 1.60934 : manager.pace
        return String(format: "%d'%02d\"%@", Int(p) / 60, Int(p) % 60, useImperial ? "/mi" : "/km")
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.caption).foregroundColor(.gray)
            Spacer()
            Text(value).font(.caption).fontWeight(.semibold).foregroundColor(.white)
        }
    }
}
