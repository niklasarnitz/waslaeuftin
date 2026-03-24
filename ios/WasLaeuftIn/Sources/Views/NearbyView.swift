import SwiftUI

struct NearbyView: View {
    @ObservedObject var viewModel: HomepageViewModel
    @ObservedObject var locationManager: LocationManager
    let selectedTab: HomepageViewModel.Tab
    var activeBaseURL: String

    @State private var showErrorAlert = false

    var body: some View {
        NavigationStack {
            ZStack {
                AppGradient.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        if let payload = viewModel.payload {
                            summaryBar(payload: payload)

                            if selectedTab == .highlights {
                                LazyVStack(spacing: 12) {
                                    ForEach(payload.movies) { movie in
                                        MovieCardView(movie: movie)
                                    }
                                }
                            } else {
                                LazyVStack(spacing: 12) {
                                    ForEach(payload.cinemas) { cinema in
                                        CinemaCardView(cinema: cinema)
                                    }
                                }
                            }
                        } else if viewModel.isLoading {
                            loadingView
                        } else if let errorMessage = viewModel.errorMessage {
                            errorCard(message: errorMessage)
                        }
                    }
                    .padding(16)
                }
                .refreshable {
                    await refreshAsync()
                }
            }
            .navigationTitle("In deiner Nähe")
            .navigationBarTitleDisplayMode(.large)
            .task {
                locationManager.start()
            }
            .onChange(of: locationManager.currentLocation) { _, newLocation in
                guard let coordinate = newLocation?.coordinate else { return }
                Task {
                    await viewModel.fetchIfNeeded(
                        baseURLString: activeBaseURL,
                        latitude: coordinate.latitude,
                        longitude: coordinate.longitude
                    )
                }
            }
            .onChange(of: viewModel.radiusKm) { _, _ in
                Task { await refreshAsync() }
            }
            .onChange(of: viewModel.errorMessage) { _, newValue in
                if newValue != nil {
                    showErrorAlert = true
                }
            }
            .alert("Fehler beim Laden", isPresented: $showErrorAlert) {
                Button("Erneut versuchen") {
                    Task { await refreshAsync() }
                }
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "Ein unbekannter Fehler ist aufgetreten.")
            }
        }
        .tint(.white)
    }

    // MARK: - Summary Bar

    private func summaryBar(payload: HomepageResponse) -> some View {
        HStack(spacing: 10) {
            summaryPill(icon: "building.2.fill", value: "\(payload.summary.cinemaCount)", label: "Kinos")
            summaryPill(icon: "film.fill", value: "\(payload.summary.movieCount)", label: "Filme")
            summaryPill(icon: "ticket.fill", value: "\(payload.summary.totalShowings)", label: "Vorstellungen")
        }
    }

    private func summaryPill(icon: String, value: String, label: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(.cyan)
            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
            Text(label)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.7))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial, in: Capsule())
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 12) {
            Spacer()
            ProgressView()
                .controlSize(.large)
            Text("Lade Vorstellungen...")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.7))
            Spacer()
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }

    // MARK: - Error

    private func errorCard(message: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Fehler beim Laden", systemImage: "exclamationmark.triangle.fill")
                .font(.headline)
                .foregroundStyle(.orange)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.85))

            Button {
                Task { await refreshAsync() }
            } label: {
                Label("Erneut versuchen", systemImage: "arrow.clockwise")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
        }
        .padding(16)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Refresh

    private func refreshAsync() async {
        let trimmedBaseURL = activeBaseURL.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedBaseURL.isEmpty else {
            viewModel.errorMessage = "Bitte eine gültige API Basis-URL setzen."
            return
        }

        guard let coordinate = locationManager.coordinates else {
            locationManager.requestLocation()
            return
        }

        await viewModel.fetch(
            baseURLString: trimmedBaseURL,
            latitude: coordinate.latitude,
            longitude: coordinate.longitude
        )
    }
}
