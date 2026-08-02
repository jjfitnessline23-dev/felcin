import SwiftUI

@main
struct FelcinWatchApp: App {
    @StateObject private var workoutManager = WorkoutManager()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                ContentView()
            }
            .environmentObject(workoutManager)
            .onAppear {
                workoutManager.requestAuthorization()
                workoutManager.activateWatchConnectivity()
            }
        }
    }
}
