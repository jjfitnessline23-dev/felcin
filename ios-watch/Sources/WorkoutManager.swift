import Foundation
import HealthKit
import Combine

class WorkoutManager: NSObject, ObservableObject {

    @Published var isRunning = false
    @Published var isPaused = false
    @Published var showingSummary = false

    @Published var heartRate: Double = 0
    @Published var distance: Double = 0
    @Published var pace: Double = 0
    @Published var calories: Double = 0
    @Published var elapsedTime: TimeInterval = 0

    let healthStore = HKHealthStore()
    var session: HKWorkoutSession?
    var builder: HKLiveWorkoutBuilder?
    var timer: AnyCancellable?
    var startDate: Date?
    var pausedTime: TimeInterval = 0

    func requestAuthorization() {
        let typesToShare: Set = [HKQuantityType.workoutType()]
        let typesToRead: Set<HKObjectType> = [
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .runningSpeed)!,
            HKQuantityType.workoutType()
        ]
        healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { _, _ in }
    }

    func startWorkout() {
        let config = HKWorkoutConfiguration()
        config.activityType = .running
        config.locationType = .outdoor

        do {
            session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            builder = session?.associatedWorkoutBuilder()
        } catch {
            return
        }

        builder?.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)
        session?.delegate = self
        builder?.delegate = self

        let now = Date()
        startDate = now
        pausedTime = 0
        session?.startActivity(with: now)
        builder?.beginCollection(withStart: now) { _, _ in }

        DispatchQueue.main.async {
            self.isRunning = true
            self.isPaused = false
        }

        startTimer()
    }

    func pauseWorkout() {
        session?.pause()
        timer?.cancel()
        pausedTime = elapsedTime
        DispatchQueue.main.async { self.isPaused = true }
    }

    func resumeWorkout() {
        session?.resume()
        startDate = Date().addingTimeInterval(-pausedTime)
        startTimer()
        DispatchQueue.main.async { self.isPaused = false }
    }

    func endWorkout() {
        session?.end()
        timer?.cancel()
        builder?.endCollection(withEnd: Date()) { _, _ in
            self.builder?.finishWorkout { _, _ in
                DispatchQueue.main.async {
                    self.isRunning = false
                    self.showingSummary = true
                }
            }
        }
    }

    func resetWorkout() {
        session = nil
        builder = nil
        heartRate = 0
        distance = 0
        pace = 0
        calories = 0
        elapsedTime = 0
        pausedTime = 0
        isRunning = false
        isPaused = false
        showingSummary = false
    }

    private func startTimer() {
        timer = Timer.publish(every: 1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                guard let self = self, let start = self.startDate else { return }
                self.elapsedTime = Date().timeIntervalSince(start)
            }
    }
}

extension WorkoutManager: HKWorkoutSessionDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession,
                        didChangeTo toState: HKWorkoutSessionState,
                        from fromState: HKWorkoutSessionState,
                        date: Date) {}

    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {}
}

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder,
                        didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }
            updateForStatistics(workoutBuilder.statistics(for: quantityType))
        }
    }

    private func updateForStatistics(_ stats: HKStatistics?) {
        guard let stats = stats else { return }
        DispatchQueue.main.async {
            switch stats.quantityType {
            case HKQuantityType.quantityType(forIdentifier: .heartRate):
                self.heartRate = stats.mostRecentQuantity()?
                    .doubleValue(for: HKUnit.count().unitDivided(by: .minute())) ?? 0
            case HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning):
                self.distance = stats.sumQuantity()?.doubleValue(for: .meter()) ?? 0
            case HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned):
                self.calories = stats.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
            case HKQuantityType.quantityType(forIdentifier: .runningSpeed):
                let mps = stats.mostRecentQuantity()?
                    .doubleValue(for: HKUnit.meter().unitDivided(by: .second())) ?? 0
                self.pace = mps > 0 ? 1000.0 / mps : 0
            default:
                break
            }
        }
    }
}
