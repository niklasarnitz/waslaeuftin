import SwiftUI

struct SettingsView: View {
    @ObservedObject var viewModel: HomepageViewModel
    @Binding var apiEnvironmentRawValue: String
    @Binding var customApiBaseURL: String
    var activeBaseURL: String

    private var apiEnvironment: APIEnvironment {
        APIEnvironment(rawValue: apiEnvironmentRawValue) ?? .production
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Suchradius") {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(Int(viewModel.radiusKm)) km")
                            .font(.headline.monospacedDigit())
                        Slider(value: $viewModel.radiusKm, in: 5...100, step: 5)
                    }
                }

                #if DEBUG
                Section("API Umgebung") {
                    Picker("Umgebung", selection: $apiEnvironmentRawValue) {
                        ForEach(APIEnvironment.allCases, id: \.self) { environment in
                            Text(environment.title).tag(environment.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)

                    if apiEnvironment == .custom {
                        TextField("https://example.com", text: $customApiBaseURL)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled(true)
                    }

                    Text("Aktive Basis-URL: \(activeBaseURL)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                #endif

                Section("Über") {
                    LabeledContent("App", value: "WasLäuftIn")
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "–")
                }
            }
            .navigationTitle("Einstellungen")
        }
    }
}
