import Foundation
import HealthKit
import Combine
import CoreLocation
import CoreMotion
import MapKit

enum ActivityType: String, CaseIterable {
    case run   = "Run"
    case cycle = "Cycle"
    case steps = "Steps"

    var systemIcon: String {
        switch self {
        case .run:   return "figure.run"
        case .cycle: return "figure.outdoor.cycle"
        case .steps: return "figure.walk"
        }
    }

    var hkActivityType: HKWorkoutActivityType {
        switch self {
        case .run:   return .running
        case .cycle: return .cycling
        case .steps: return .walking
        }
    }
}

class WorkoutManager: NSObject, ObservableObject {
    @Published var activityType:  ActivityType   = .run
    @Published var isRunning      = false
    @Published var isPaused       = false
    @Published var showingSummary = false
    @Published var heartRate:   Double       = 0
    @Published var distance:    Double       = 0
    @Published var pace:        Double       = 0
    @Published var calories:    Double       = 0
    @Published var elapsedTime: TimeInterval = 0
    @Published var speed:       Double       = 0
    @Published var stepCount:   Int          = 0
    @Published var coordinates: [CLLocationCoordinate2D] = []
    @Published var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.7128, longitude: -74.0060),
        span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
    )

    let healthStore             = HKHealthStore()
    var session:    HKWorkoutSession?
    var builder:    HKLiveWorkoutBuilder?
    var timer:      AnyCancellable?
    var startDate:  Date?
    var pausedTime: TimeInterval = 0
    private let locationManager = CLLocationManager()
    private let pedometer       = CMPedometer()

    func requestAuthorization() {
        let share: Set = [HKQuantityType.workoutType()]
        let read: Set<HKObjectType> = [
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .distanceCycling)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .runningSpeed)!,
            HKQuantityType.quantityType(forIdentifier: .stepCount)!,
            HKQuantityType.workoutType()
        ]
        healthStore.requestAuthorization(toShare: share, read: read) { _, _ in }
        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func startWorkout(type: ActivityType) {
        activityType = type
        coordinates = []; heartRate = 0; distance = 0; pace = 0
        calories = 0; elapsedTime = 0; speed = 0; stepCount = 0
        let config = HKWorkoutConfiguration()
        config.activityType = type.hkActivityType
        config.locationType = .outdoor
        do {
            session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            builder = session?.associatedWorkoutBuilder()
        } catch { return }
        builder?.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)
        session?.delegate = self
        builder?.delegate = self
        let now = Date()
        startDate = now; pausedTime = 0
        session?.startActivity(with: now)
        builder?.beginCollection(withStart: now) { _, _ in }
        DispatchQueue.main.async { self.isRunning = true; self.isPaused = false }
        startTimer()
        locationManager.startUpdatingLocation()
        if type == .steps, CMPedometer.isStepCountingAvailable() {
            pedometer.startUpdates(from: now) { [weak self] data, _ in
                guard let data = data else { return }
                DispatchQueue.main.async { self?.stepCount = data.numberOfSteps.intValue }
            }
        }
    }

    func pauseWorkout() {
        session?.pause(); timer?.cancel()
        locationManager.stopUpdatingLocation()
        if activityType == .steps { pedometer.stopUpdates() }
        pausedTime = elapsedTime
        DispatchQueue.main.async { self.isPaused = true }
    }

    func resumeWorkout() {
        session?.resume()
        startDate = Date().addingTimeInterval(-pausedTime)
        startTimer()
        locationManager.startUpdatingLocation()
        DispatchQueue.main.async { self.isPaused = false }
    }

    func endWorkout() {
        session?.end(); timer?.cancel()
        locationManager.stopUpdatingLocation(); pedometer.stopUpdates()
        builder?.endCollection(withEnd: Date()) { _, _ in
            self.builder?.finishWorkout { _, _ in
                DispatchQueue.main.async { self.isRunning = false; self.showingSummary = true }
            }
        }
    }

    func resetWorkout() {
        session = nil; builder = nil
        heartRate = 0; distance = 0; pace = 0; calories = 0
        elapsedTime = 0; pausedTime = 0; speed = 0; stepCount = 0
        coordinates = []
        isRunning = false; isPaused = false; showingSummary = false
    }

    private func startTimer() {
        timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
            .sink { [weak self] _ in
                guard let self = self, let start = self.startDate else { return }
                self.elapsedTime = Date().timeIntervalSince(start)
            }
    }
}

extension WorkoutManager: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last, isRunning, !isPaused else { return }
        let coord = loc.coordinate
        DispatchQueue.main.async {
            self.coordinates.append(coord)
            self.region = MKCoordinateRegion(center: coord,
                span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005))
        }
    }
}

extension WorkoutManager: HKWorkoutSessionDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
                        from fromState: HKWorkoutSessionState, date: Date) {}
    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {}
}

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder,
                        didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let q = type as? HKQuantityType else { continue }
            updateForStatistics(workoutBuilder.statistics(for: q))
        }
    }
    private func updateForStatistics(_ stats: HKStatistics?) {
        guard let stats = stats else { return }
        DispatchQueue.main.async {
            switch stats.quantityType {
            case HKQuantityType.quantityType(forIdentifier: .heartRate):
                self.heartRate = stats.mostRecentQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute())) ?? 0
            case HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning):
                if self.activityType != .cycle { self.distance = stats.sumQuantity()?.doubleValue(for: .meter()) ?? 0 }
            case HKQuantityType.quantityType(forIdentifier: .distanceCycling):
                if self.activityType == .cycle { self.distance = stats.sumQuantity()?.doubleValue(for: .meter()) ?? 0 }
            case HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned):
                self.calories = stats.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
            case HKQuantityType.quantityType(forIdentifier: .runningSpeed):
                let mps = stats.mostRecentQuantity()?.doubleValue(for: HKUnit.meter().unitDivided(by: .second())) ?? 0
                self.speed = mps; self.pace = mps > 0 ? 1000.0 / mps : 0
            default: break
            }
        }
    }
}