import SwiftUI

@main
struct WasLaeuftInApp: App {
    @StateObject private var viewModel = HomepageViewModel()
    @StateObject private var locationManager = LocationManager()
    @AppStorage("apiEnvironment") private var apiEnvironmentRawValue = APIEnvironment.production.rawValue
    @AppStorage("customApiBaseURL") private var customApiBaseURL = ""

    init() {
        URLCache.shared = URLCache(
            memoryCapacity: 100 * 1024 * 1024,
            diskCapacity: 500 * 1024 * 1024,
            diskPath: "waslaeuftin-url-cache"
        )
    }

    private var apiEnvironment: APIEnvironment {
        APIEnvironment(rawValue: apiEnvironmentRawValue) ?? .production
    }

    private var activeBaseURL: String {
        if apiEnvironment == .custom {
            return customApiBaseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return apiEnvironment.baseURL
    }

    var body: some Scene {
        WindowGroup {
            MainTabView(
                viewModel: viewModel,
                locationManager: locationManager,
                apiEnvironmentRawValue: $apiEnvironmentRawValue,
                customApiBaseURL: $customApiBaseURL,
                activeBaseURL: activeBaseURL
            )
            .onChange(of: apiEnvironmentRawValue) { _, _ in
                refreshData()
            }
            .onChange(of: customApiBaseURL) { _, _ in
                if apiEnvironment == .custom {
                    refreshData()
                }
            }
        }
    }

    private func refreshData() {
        guard let coordinate = locationManager.coordinates else { return }
        let baseURL = activeBaseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !baseURL.isEmpty else { return }
        Task {
            await viewModel.fetch(
                baseURLString: baseURL,
                latitude: coordinate.latitude,
                longitude: coordinate.longitude
            )
        }
    }
}
