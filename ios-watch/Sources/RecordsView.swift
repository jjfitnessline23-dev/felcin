import SwiftUI

struct RecordsView: View {
    @EnvironmentObject var manager: WorkoutManager
    @AppStorage("useImperial") var useImperial = false

    private var hasUID: Bool {
        !(UserDefaults.standard.string(forKey: "felcin_uid") ?? "").isEmpty
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if manager.isPairing {
                    pairingView
                } else if manager.pairingExpired {
                    expiredView
                } else if !hasUID {
                    linkView
                } else if manager.loadingRecords {
                    VStack(spacing: 8) {
                        ProgressView()
                        Text("Loading records…")
                            .font(.caption).foregroundColor(.gray)
                    }
                    .padding(.top, 20)
                } else if let err = manager.recordsError {
                    VStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 20)).foregroundColor(.orange)
                        Text(err).font(.caption).foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                        Button(action: { manager.fetchRecords() }) {
                            Text("Retry")
                                .font(.caption).fontWeight(.bold).foregroundColor(.white)
                                .padding(.horizontal, 20).padding(.vertical, 8)
                                .background(Color.blue.opacity(0.8)).cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.top, 16)
                } else {
                    recordCard("RUNNING",  icon: "figure.run",            color: .green, rows: runRows)
                    recordCard("CYCLING",  icon: "figure.outdoor.cycle",  color: .blue,  rows: cycleRows)
                    Button(action: { manager.fetchRecords() }) {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.clockwise").font(.system(size: 11))
                            Text("Refresh").font(.caption)
                        }
                        .foregroundColor(.gray)
                    }
                    .buttonStyle(.plain).padding(.top, 4)
                }
            }
            .padding()
        }
        .navigationTitle("My Records")
        .onAppear {
            if hasUID { manager.fetchRecords() }
        }
    }

    // ── Pairing screens ──────────────────────────────────────────────────────

    private var linkView: some View {
        VStack(spacing: 14) {
            Image(systemName: "applewatch.radiowaves.left.and.right")
                .font(.system(size: 30)).foregroundColor(.blue)
            Text("Link Your Account")
                .font(.headline).foregroundColor(.white)
            Text("On your iPhone, open Safari and go to:\nfelcin.com/watch-link")
                .font(.caption).foregroundColor(.gray)
                .multilineTextAlignment(.center)
            Button(action: { manager.initiatePairing() }) {
                Text("Get Code")
                    .font(.subheadline).fontWeight(.bold).foregroundColor(.white)
                    .frame(maxWidth: .infinity).padding(.vertical, 12)
                    .background(Color.blue).cornerRadius(12)
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 12)
    }

    private var pairingView: some View {
        VStack(spacing: 10) {
            Image(systemName: "applewatch.radiowaves.left.and.right")
                .font(.system(size: 24)).foregroundColor(.blue)
            Text("Go to felcin.com/watch-link on your iPhone and enter:")
                .font(.caption2).foregroundColor(.gray)
                .multilineTextAlignment(.center)
            if let code = manager.pairingCode {
                Text(code)
                    .font(.system(size: 36, weight: .black, design: .monospaced))
                    .foregroundColor(.blue)
                    .tracking(4)
            } else {
                ProgressView()
            }
            HStack(spacing: 4) {
                ProgressView().scaleEffect(0.5)
                Text("Waiting… (10 min)")
                    .font(.caption2).foregroundColor(.gray)
            }
        }
        .padding()
    }

    private var expiredView: some View {
        VStack(spacing: 12) {
            Image(systemName: "clock.badge.exclamationmark")
                .font(.system(size: 24)).foregroundColor(.orange)
            Text("Code expired").font(.caption).foregroundColor(.gray)
            Button(action: { manager.initiatePairing() }) {
                Text("Get New Code")
                    .font(.caption).fontWeight(.bold).foregroundColor(.white)
                    .padding(.horizontal, 20).padding(.vertical, 8)
                    .background(Color.blue.opacity(0.8)).cornerRadius(8)
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 16)
    }

    // ── Records content ──────────────────────────────────────────────────────

    private var runRows: [(String, String)] {
        var rows: [(String, String)] = []
        if manager.bestRunDist > 100 {
            let val = useImperial ? manager.bestRunDist / 1609.34 : manager.bestRunDist / 1000
            rows.append(("Best Distance", String(format: "%.2f %@", val, useImperial ? "mi" : "km")))
        }
        if manager.bestRunPace > 0 {
            let p = useImperial ? manager.bestRunPace * 1.60934 : manager.bestRunPace
            rows.append(("Best Pace", String(format: "%d'%02d\"%@", Int(p)/60, Int(p)%60, useImperial ? "/mi" : "/km")))
        }
        return rows.isEmpty ? [("No runs recorded yet", "—")] : rows
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
        return rows.isEmpty ? [("No rides recorded yet", "—")] : rows
    }

    private func recordCard(_ title: String, icon: String, color: Color, rows: [(String, String)]) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 12)).foregroundColor(color)
                Text(title).font(.system(size: 10, weight: .bold)).foregroundColor(.gray).kerning(1)
                Spacer()
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(color.opacity(0.1))

            ForEach(rows, id: \.0) { label, value in
                HStack {
                    Text(label).font(.caption).foregroundColor(.gray)
                    Spacer()
                    Text(value).font(.caption).fontWeight(.bold)
                        .foregroundColor(value == "—" ? .gray : .white)
                }
                .padding(.horizontal, 12).padding(.vertical, 8)
            }
        }
        .background(Color.white.opacity(0.06))
        .cornerRadius(12)
    }
}
