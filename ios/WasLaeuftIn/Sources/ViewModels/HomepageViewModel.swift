import Foundation

@MainActor
final class HomepageViewModel: ObservableObject {
    @Published var payload: HomepageResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedTab: Tab = .highlights
    @Published var radiusKm: Double = 20
    @Published var selectedDate: Date = Date()

    enum Tab: String, CaseIterable {
        case highlights = "Filme"
        case cinemas = "Kinos"
    }

    private struct HomepageCacheEntry: Codable {
        let key: String
        let savedAt: Date
        let payload: HomepageResponse
    }

    private enum Cache {
        static let storageKey = "homepage.cache.entry"
        static let maxAge: TimeInterval = 60 * 60
    }

    private let client = HomepageAPIClient()
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func fetchIfNeeded(baseURLString: String, latitude: Double, longitude: Double) async {
        if payload == nil {
            await fetch(baseURLString: baseURLString, latitude: latitude, longitude: longitude)
        }
    }

    func fetch(baseURLString: String, latitude: Double, longitude: Double) async {
        let key = cacheKey(
            baseURLString: baseURLString,
            latitude: latitude,
            longitude: longitude,
            radiusKm: radiusKm,
            date: selectedDate
        )

        if let cachedPayload = loadCache(for: key) {
            payload = cachedPayload
            errorMessage = nil
            isLoading = false

            // Keep UI responsive by refreshing silently in the background.
            Task { [weak self] in
                guard let self else { return }
                await self.refreshFromNetwork(
                    baseURLString: baseURLString,
                    latitude: latitude,
                    longitude: longitude,
                    key: key,
                    showLoading: false,
                    reportErrors: false
                )
            }
            return
        }

        await refreshFromNetwork(
            baseURLString: baseURLString,
            latitude: latitude,
            longitude: longitude,
            key: key,
            showLoading: true,
            reportErrors: true
        )
    }

    private func refreshFromNetwork(
        baseURLString: String,
        latitude: Double,
        longitude: Double,
        key: String,
        showLoading: Bool,
        reportErrors: Bool
    ) async {
        if showLoading {
            isLoading = true
            errorMessage = nil
        }

        do {
            let response = try await client.fetchHomepage(
                baseURLString: baseURLString,
                latitude: latitude,
                longitude: longitude,
                radiusKm: radiusKm,
                date: selectedDate
            )
            payload = response
            errorMessage = nil
            saveCache(payload: response, key: key)
        } catch {
            if reportErrors {
                errorMessage = error.localizedDescription
            }
        }

        if showLoading {
            isLoading = false
        }
    }

    private func cacheKey(
        baseURLString: String,
        latitude: Double,
        longitude: Double,
        radiusKm: Double,
        date: Date
    ) -> String {
        let lat = String(format: "%.3f", latitude)
        let lon = String(format: "%.3f", longitude)
        let radius = String(format: "%.1f", radiusKm)

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateString = formatter.string(from: date)

        return "\(baseURLString)|lat=\(lat)|lon=\(lon)|radius=\(radius)|date=\(dateString)"
    }

    private func loadCache(for key: String) -> HomepageResponse? {
        guard let data = defaults.data(forKey: Cache.storageKey) else {
            return nil
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .millisecondsSince1970

        guard let entry = try? decoder.decode(HomepageCacheEntry.self, from: data) else {
            return nil
        }

        let age = Date().timeIntervalSince(entry.savedAt)
        guard entry.key == key, age <= Cache.maxAge else {
            return nil
        }

        return entry.payload
    }

    private func saveCache(payload: HomepageResponse, key: String) {
        let entry = HomepageCacheEntry(key: key, savedAt: Date(), payload: payload)

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .millisecondsSince1970

        guard let data = try? encoder.encode(entry) else {
            return
        }

        defaults.set(data, forKey: Cache.storageKey)
    }
}
