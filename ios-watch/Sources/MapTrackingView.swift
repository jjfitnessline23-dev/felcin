import SwiftUI
import MapKit

struct MapTrackingView: View {
    @EnvironmentObject var manager: WorkoutManager

    var body: some View {
        ZStack(alignment: .bottom) {
            if #available(watchOS 10.0, *) {
                ModernMap()
            } else {
                LegacyMap()
            }

            if manager.coordinates.isEmpty {
                Text("Waiting for GPS…")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(Color.black.opacity(0.55))
                    .cornerRadius(6)
                    .padding(.bottom, 6)
            }
        }
    }
}

@available(watchOS 10.0, *)
private struct ModernMap: View {
    @EnvironmentObject var manager: WorkoutManager

    var body: some View {
        Map {
            UserAnnotation()
            if manager.coordinates.count > 1 {
                MapPolyline(coordinates: manager.coordinates)
                    .stroke(manager.activityType == .cycle ? Color.blue : Color.green,
                            lineWidth: 3)
            }
        }
        .mapStyle(.standard(elevation: .flat))
    }
}

private struct LegacyMap: View {
    @EnvironmentObject var manager: WorkoutManager

    var body: some View {
        Map(coordinateRegion: $manager.region, showsUserLocation: true)
    }
}