import Foundation
import HealthKit
import Combine
import CoreLocation
import CoreMotion
import MapKit
import WatchConnectivity

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
    @Published var activityType:   ActivityType  = .run
    @Published var dailySteps:     Int           = 0
    @Published var isDistancePR    = false
    @Published var isPacePR        = false
    @Published var bestRunDist:    Double        = 0
    @Published var bestRunPace:    Double        = 0
    @Published var bestCycleDist:  Double        = 0
    @Published var bestCycleSpeed: Double        = 0
    @Published var loadingRecords  = false
    @Published var recordsError:   String?       = nil
    @Published var isPairing       = false
    @Published var pairingCode:    String?       = nil
    @Published var pairingExpired  = false
    @Published var isSyncing       = false
    @Published var syncSaved       = false
    @Published var syncError:      String?       = nil
    @Published var noUID           = false
    @Published var isRunning       = false
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

    func activateWatchConnectivity() {
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func requestAuthorization() {
        let share: Set<HKSampleType> = [
            HKQuantityType.workoutType(),
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .distanceCycling)!,
            HKQuantityType.quantityType(forIdentifier: .runningSpeed)!,
        ]
        let read: Set<HKObjectType> = [
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .distanceCycling)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .runningSpeed)!,
            HKQuantityType.quantityType(forIdentifier: .stepCount)!,
            HKQuantityType.workoutType()
        ]
        healthStore.requestAuthorization(toShare: share, read: read) { [weak self] _, _ in
            self?.fetchDailySteps()
        }
        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func fetchDailySteps() {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }
        let startOfDay = Calendar.current.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date(), options: .strictStartDate)
        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, stats, _ in
            let steps = Int(stats?.sumQuantity()?.doubleValue(for: .count()) ?? 0)
            DispatchQueue.main.async { self?.dailySteps = steps }
            self?.syncDailyStepsToFelcin(steps: steps)
        }
        healthStore.execute(query)
    }

    func syncDailyStepsToFelcin(steps: Int) {
        let uid = UserDefaults.standard.string(forKey: "felcin_uid") ?? ""
        guard !uid.isEmpty, steps > 0 else { return }
        let secret = Bundle.main.object(forInfoDictionaryKey: "WATCH_SYNC_SECRET") as? String ?? ""
        let cal = Calendar.current
        let comps = cal.dateComponents([.year, .month, .day], from: Date())
        let dateStr = String(format: "%04d-%02d-%02d", comps.year ?? 0, comps.month ?? 0, comps.day ?? 0)
        let body: [String: Any] = ["uid": uid, "secret": secret, "steps": steps, "date": dateStr]
        guard let url = URL(string: "https://www.felcin.com/api/save-steps"),
              let data = try? JSONSerialization.data(withJSONObject: body) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = data
        req.timeoutInterval = 15
        URLSession.shared.dataTask(with: req).resume()
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
        let endTime = Date()
        builder?.endCollection(withEnd: endTime) { _, _ in
            self.builder?.finishWorkout { _, _ in
                DispatchQueue.main.async {
                    self.isRunning = false
                    self.showingSummary = true
                    self.syncToFelcin()
                }
            }
        }
    }

    func syncToFelcin() {
        let uid = UserDefaults.standard.string(forKey: "felcin_uid") ?? ""
        guard !uid.isEmpty else {
            DispatchQueue.main.async { self.noUID = true }
            return
        }

        DispatchQueue.main.async { self.isSyncing = true; self.syncError = nil }

        let secret = Bundle.main.object(forInfoDictionaryKey: "WATCH_SYNC_SECRET") as? String ?? ""
        let day = Calendar.current.weekdaySymbols[Calendar.current.component(.weekday, from: Date()) - 1]
        let actType = activityType == .cycle ? "cycle" : "run"
        let coordArray = coordinates.map { ["lat": $0.latitude, "lng": $0.longitude] }

        let body: [String: Any] = [
            "uid":          uid,
            "secret":       secret,
            "distance":     distance,
            "duration":     elapsedTime,
            "avgPace":      pace,
            "name":         "\(day.prefix(3)) \(actType.capitalized)",
            "coordinates":  coordArray,
            "activityType": actType,
            "calories":     calories,
            "heartRate":    heartRate,
        ]

        guard let url = URL(string: "https://www.felcin.com/api/save-watch-run"),
              let data = try? JSONSerialization.data(withJSONObject: body) else {
            DispatchQueue.main.async { self.isSyncing = false; self.syncError = "Could not build request" }
            return
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = data
        req.timeoutInterval = 30

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isSyncing = false
                if let error = error {
                    self?.syncError = error.localizedDescription; return
                }
                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    self?.syncError = "Server error"; return
                }
                if let errMsg = json["error"] as? String {
                    self?.syncError = errMsg; return
                }
                self?.syncSaved     = true
                self?.isDistancePR  = json["isDistancePR"] as? Bool ?? false
                self?.isPacePR      = json["isPacePR"]     as? Bool ?? false
                // Refresh records so My Records screen is up to date
                self?.fetchRecords()
            }
        }.resume()
    }

    func loadCachedRecords() {
        let ud = UserDefaults.standard
        let d  = ud.double(forKey: "felcin_bestRunDist")
        let p  = ud.double(forKey: "felcin_bestRunPace")
        let cd = ud.double(forKey: "felcin_bestCycleDist")
        let cs = ud.double(forKey: "felcin_bestCycleSpeed")
        if d > 0 { bestRunDist    = d }
        if p > 0 { bestRunPace    = p }
        if cd > 0 { bestCycleDist = cd }
        if cs > 0 { bestCycleSpeed = cs }
    }

    func fetchRecords() {
        let uid = UserDefaults.standard.string(forKey: "felcin_uid") ?? ""
        guard !uid.isEmpty else {
            // Try pulling UID from iPhone automatically before giving up
            if WCSession.default.activationState == .activated, WCSession.default.isReachable {
                DispatchQueue.main.async { self.recordsError = "Syncing account from iPhone…" }
                requestUIDFromPhone()
            } else {
                DispatchQueue.main.async { self.recordsError = "Open Felcin on iPhone, then tap Retry" }
            }
            return
        }
        let escaped = uid.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? uid
        guard let url = URL(string: "https://www.felcin.com/api/get-records?uid=\(escaped)") else { return }
        DispatchQueue.main.async { self.loadingRecords = true; self.recordsError = nil }
        URLSession.shared.dataTask(with: URLRequest(url: url)) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.loadingRecords = false
                if let error = error {
                    self?.recordsError = "Network error: \(error.localizedDescription)"; return
                }
                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    self?.recordsError = "Could not read response"; return
                }
                if let errMsg = json["error"] as? String {
                    self?.recordsError = errMsg; return
                }
                let run   = json["run"]   as? [String: Any] ?? [:]
                let cycle = json["cycle"] as? [String: Any] ?? [:]
                let d  = run["bestDist"]    as? Double ?? 0
                let p  = run["bestPace"]    as? Double ?? 0
                let cd = cycle["bestDist"]  as? Double ?? 0
                let cs = cycle["bestSpeed"] as? Double ?? 0
                self?.bestRunDist    = d
                self?.bestRunPace    = p
                self?.bestCycleDist  = cd
                self?.bestCycleSpeed = cs
                // Cache so Records screen loads instantly next time
                let ud = UserDefaults.standard
                ud.set(d,  forKey: "felcin_bestRunDist")
                ud.set(p,  forKey: "felcin_bestRunPace")
                ud.set(cd, forKey: "felcin_bestCycleDist")
                ud.set(cs, forKey: "felcin_bestCycleSpeed")
            }
        }.resume()
    }

    func resetWorkout() {
        session = nil; builder = nil
        heartRate = 0; distance = 0; pace = 0; calories = 0
        elapsedTime = 0; pausedTime = 0; speed = 0; stepCount = 0
        coordinates = []
        isDistancePR = false; isPacePR = false
        isSyncing = false; syncSaved = false; syncError = nil; noUID = false
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

extension WorkoutManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let uid = UserDefaults.standard.string(forKey: "felcin_uid") ?? ""
        if uid.isEmpty { requestUIDFromPhone() }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        if let uid = message["felcin_uid"] as? String, !uid.isEmpty {
            UserDefaults.standard.set(uid, forKey: "felcin_uid")
            DispatchQueue.main.async { self.fetchRecords() }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        if let uid = applicationContext["felcin_uid"] as? String, !uid.isEmpty {
            UserDefaults.standard.set(uid, forKey: "felcin_uid")
            DispatchQueue.main.async { self.fetchRecords() }
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        if let uid = userInfo["felcin_uid"] as? String, !uid.isEmpty {
            UserDefaults.standard.set(uid, forKey: "felcin_uid")
            DispatchQueue.main.async { self.fetchRecords() }
        }
    }
}

extension WorkoutManager {
    func requestUIDFromPhone() {
        guard WCSession.default.activationState == .activated,
              WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["request": "uid"], replyHandler: { [weak self] reply in
            if let uid = reply["felcin_uid"] as? String, !uid.isEmpty {
                UserDefaults.standard.set(uid, forKey: "felcin_uid")
                DispatchQueue.main.async { self?.fetchRecords() }
            }
        }, errorHandler: nil)
    }

    func initiatePairing() {
        isPairing = true
        pairingCode = nil
        pairingExpired = false
        guard let url = URL(string: "https://www.felcin.com/api/watch-init") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 15
        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let code = json["code"] as? String else {
                DispatchQueue.main.async { self?.isPairing = false }
                return
            }
            DispatchQueue.main.async { self?.pairingCode = code }
            self?.pollForUID(code: code)
        }.resume()
    }

    private func pollForUID(code: String) {
        guard isPairing else { return }
        guard let url = URL(string: "https://www.felcin.com/api/watch-poll?code=\(code)") else { return }
        URLSession.shared.dataTask(with: URLRequest(url: url)) { [weak self] data, _, _ in
            guard let self = self else { return }
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) { self.pollForUID(code: code) }
                return
            }
            if let uid = json["uid"] as? String, !uid.isEmpty {
                UserDefaults.standard.set(uid, forKey: "felcin_uid")
                DispatchQueue.main.async {
                    self.isPairing = false
                    self.pairingCode = nil
                    self.fetchRecords()
                }
            } else if json["expired"] as? Bool == true {
                DispatchQueue.main.async {
                    self.isPairing = false
                    self.pairingExpired = true
                }
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) { self.pollForUID(code: code) }
            }
        }.resume()
    }
}