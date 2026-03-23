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
                activeBaseURL: activeBaseURL
            )
            .tabItem {
                Label("Entdecken", systemImage: "safari")
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
