import SwiftUI

// ContentView is no longer used. The app entry point is WasLaeuftInApp → MainTabView.
// This file is kept to avoid breaking any storyboard or preview references.
struct ContentView: View {
    var body: some View {
        MainTabView(
            viewModel: HomepageViewModel(),
            locationManager: LocationManager(),
            apiEnvironmentRawValue: .constant(APIEnvironment.production.rawValue),
            customApiBaseURL: .constant(""),
            activeBaseURL: APIEnvironment.production.baseURL
        )
    }
}
