import SwiftUI

struct WorkoutView: View {
    @EnvironmentObject var manager: WorkoutManager

    var body: some View {
        TabView {
            MetricsView()
            if manager.activityType != .steps {
                MapTrackingView()
            }
        }
        .tabViewStyle(.page)
    }
}

struct MetricsView: View {
    @EnvironmentObject var manager: WorkoutManager

    var body: some View {
        VStack(spacing: 2) {
            Text(elapsedString)
                .font(.system(size: 24, weight: .bold, design: .monospaced))
                .foregroundColor(.white)

            if manager.activityType == .steps {
                HStack(alignment: .lastTextBaseline, spacing: 3) {
                    Text("\(manager.stepCount)")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.orange)
                    Text("steps")
                        .font(.caption).foregroundColor(.gray)
                }
            } else {
                HStack(alignment: .lastTextBaseline, spacing: 3) {
                    Text(String(format: "%.2f", manager.distance / 1000))
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(manager.activityType == .cycle ? .blue : .green)
                    Text("km")
                        .font(.caption).foregroundColor(.gray)
                }
            }

            HStack {
                VStack(spacing: 0) {
                    if manager.activityType == .cycle {
                        Text(speedString)
                            .font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
                        Text("km/h")
                            .font(.system(size: 10)).foregroundColor(.gray)
                    } else if manager.activityType == .run {
                        Text(paceString)
                            .font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
                        Text("/km")
                            .font(.system(size: 10)).foregroundColor(.gray)
                    } else {
                        Text(String(format: "%.2f km", manager.distance / 1000))
                            .font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
                        Text("dist")
                            .font(.system(size: 10)).foregroundColor(.gray)
                    }
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 0) {
                    HStack(spacing: 2) {
                        Text(manager.heartRate > 0 ? "\(Int(manager.heartRate))" : "--")
                            .font(.system(size: 15, weight: .semibold)).foregroundColor(.red)
                        Image(systemName: "heart.fill")
                            .font(.system(size: 10)).foregroundColor(.red)
                    }
                    Text("bpm")
                        .font(.system(size: 10)).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
            }

            HStack(spacing: 2) {
                Text(String(Int(manager.calories)))
                    .font(.system(size: 13, weight: .semibold)).foregroundColor(.orange)
                Text("cal")
                    .font(.system(size: 11)).foregroundColor(.gray)
            }

            Spacer()

            HStack(spacing: 16) {
                Button(action: manager.isPaused ? manager.resumeWorkout : manager.pauseWorkout) {
                    Image(systemName: manager.isPaused ? "play.fill" : "pause.fill")
                        .font(.system(size: 16, weight: .semibold)).foregroundColor(.white)
                        .frame(width: 42, height: 42)
                        .background(Color.gray.opacity(0.35)).clipShape(Circle())
                }
                .buttonStyle(.plain)

                Button(action: manager.endWorkout) {
                    Image(systemName: "stop.fill")
                        .font(.system(size: 16, weight: .semibold)).foregroundColor(.white)
                        .frame(width: 42, height: 42)
                        .background(Color.red.opacity(0.85)).clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 4)
    }

    private var elapsedString: String {
        let t = Int(manager.elapsedTime)
        let h = t / 3600, m = (t % 3600) / 60, s = t % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
    }
    private var paceString: String {
        guard manager.pace > 0 else { return "--'--\"" }
        let m = Int(manager.pace) / 60, s = Int(manager.pace) % 60
        return String(format: "%d'%02d\"", m, s)
    }
    private var speedString: String {
        guard manager.speed > 0 else { return "--.-" }
        return String(format: "%.1f", manager.speed * 3.6)
    }
}