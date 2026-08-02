import SwiftUI

struct RecordsView: View {
    @EnvironmentObject var manager: WorkoutManager
    @AppStorage("useImperial") var useImperial = false

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if manager.loadingRecords {
                    ProgressView()
                        .padding(.top, 20)
                } else {
                    recordCard(
                        title: "RUNNING",
                        icon: "figure.run",
                        color: .green,
                        rows: runRows
                    )
                    recordCard(
                        title: "CYCLING",
                        icon: "figure.outdoor.cycle",
                        color: .blue,
                        rows: cycleRows
                    )
                }
            }
            .padding()
        }
        .navigationTitle("My Records")
        .onAppear { manager.fetchRecords() }
    }

    private var runRows: [(String, String)] {
        var rows: [(String, String)] = []
        if manager.bestRunDist > 100 {
            let val = useImperial ? manager.bestRunDist / 1609.34 : manager.bestRunDist / 1000
            rows.append(("Best Distance", String(format: "%.2f %@", val, useImperial ? "mi" : "km")))
        }
        if manager.bestRunPace > 0 {
            let p = useImperial ? manager.bestRunPace * 1.60934 : manager.bestRunPace
            let unit = useImperial ? "/mi" : "/km"
            rows.append(("Best Pace", String(format: "%d'%02d\"%@", Int(p) / 60, Int(p) % 60, unit)))
        }
        return rows.isEmpty ? [("No runs yet", "—")] : rows
    }

    private var cycleRows: [(String, String)] {
        var rows: [(String, String)] = []
        if manager.bestCycleDist > 100 {
            let val = useImperial ? manager.bestCycleDist / 1609.34 : manager.bestCycleDist / 1000
            rows.append(("Best Distance", String(format: "%.2f %@", val, useImperial ? "mi" : "km")))
        }
        if manager.bestCycleSpeed > 0 {
            let spd = useImperial ? manager.bestCycleSpeed * 2.23694 : manager.bestCycleSpeed * 3.6
            rows.append(("Best Speed", String(format: "%.1f %@", spd, useImperial ? "mph" : "km/h")))
        }
        return rows.isEmpty ? [("No rides yet", "—")] : rows
    }

    private func recordCard(title: String, icon: String, color: Color, rows: [(String, String)]) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundColor(color)
                Text(title)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.gray)
                    .kerning(1)
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(color.opacity(0.1))

            ForEach(rows, id: \.0) { label, value in
                HStack {
                    Text(label)
                        .font(.caption)
                        .foregroundColor(.gray)
                    Spacer()
                    Text(value)
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
        }
        .background(Color.white.opacity(0.06))
        .cornerRadius(12)
    }
}
