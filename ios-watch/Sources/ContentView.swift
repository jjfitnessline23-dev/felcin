import SwiftUI

struct ContentView: View {
    @EnvironmentObject var manager: WorkoutManager

    var body: some View {
        if manager.showingSummary {
            SummaryView()
        } else if manager.isRunning || manager.isPaused {
            WorkoutView()
        } else {
            StartView()
        }
    }
}

struct StartView: View {
    @EnvironmentObject var manager: WorkoutManager

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "figure.run")
                .font(.system(size: 40))
                .foregroundColor(.green)

            Text("Felcin Run")
                .font(.headline)
                .foregroundColor(.white)

            Button(action: manager.startWorkout) {
                Text("Start")
                    .font(.headline)
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.green)
                    .cornerRadius(8)
            }
            .buttonStyle(.plain)
        }
        .padding()
    }
}
