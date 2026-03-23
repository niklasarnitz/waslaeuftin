import SwiftUI

struct MainTabView: View {
    @ObservedObject var viewModel: HomepageViewModel
    @ObservedObject var locationManager: LocationManager
    @Binding var apiEnvironmentRawValue: String
    @Binding var customApiBaseURL: String
    var activeBaseURL: String

    var body: some View {
        TabView {
            NearbyView(
                viewModel: viewModel,
                locationManager: locationManager,
                selectedTab: .highlights,
                activeBaseURL: activeBaseURL
            )
            .tabItem {
                Label("Filme", systemImage: "film")
            }

            NearbyView(
                viewModel: viewModel,
                locationManager: locationManager,
                selectedTab: .cinemas,
                activeBaseURL: activeBaseURL
            )
            .tabItem {
                Label("Kinos", systemImage: "building.2")
            }

            SettingsView(
                viewModel: viewModel,
                apiEnvironmentRawValue: $apiEnvironmentRawValue,
                customApiBaseURL: $customApiBaseURL,
                activeBaseURL: activeBaseURL
            )
            .tabItem {
                Label("Einstellungen", systemImage: "gearshape")
            }
        }
        .tint(.cyan)
    }
}
