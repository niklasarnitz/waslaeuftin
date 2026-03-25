import SwiftUI

struct SearchView: View {
    @StateObject private var viewModel = SearchViewModel()
    var activeBaseURL: String

    var body: some View {
        NavigationStack {
            ZStack {
                AppGradient.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if let results = viewModel.results {
                            if results.cities.isEmpty && results.cinemas.isEmpty {
                                emptyState(message: "Keine Ergebnisse gefunden.")
                            } else {
                                if !results.cities.isEmpty {
                                    sectionHeader("Städte")
                                    ForEach(results.cities) { city in
                                        Link(destination: URL(string: "\(activeBaseURL)/city/\(city.slug)")!) {
                                            resultRow(
                                                icon: "mappin.circle.fill",
                                                title: city.name,
                                                subtitle: nil
                                            )
                                        }
                                    }
                                }

                                if !results.cinemas.isEmpty {
                                    sectionHeader("Kinos")
                                    ForEach(results.cinemas) { cinema in
                                        Link(destination: URL(string: "\(activeBaseURL)/cinema/\(cinema.slug)")!) {
                                            resultRow(
                                                icon: "building.2.fill",
                                                title: cinema.name,
                                                subtitle: cinema.city.name
                                            )
                                        }
                                    }
                                }
                            }
                        } else if viewModel.query.isEmpty {
                            emptyState(message: "Suche nach Städten und Kinos.")
                        } else if viewModel.isSearching {
                            HStack {
                                Spacer()
                                ProgressView()
                                    .controlSize(.large)
                                Spacer()
                            }
                            .padding(.top, 40)
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Suche")
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $viewModel.query, prompt: "Stadt oder Kino suchen")
            .onChange(of: viewModel.query) { _, _ in
                viewModel.search(baseURLString: activeBaseURL)
            }
        }
        .tint(.white)
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.white.opacity(0.7))
            .padding(.top, 4)
    }

    private func resultRow(icon: String, title: String, subtitle: String?) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.cyan)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body.weight(.medium))
                    .foregroundStyle(.white)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.6))
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.3))
        }
        .padding(14)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func emptyState(message: String) -> some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "magnifyingglass")
                .font(.largeTitle)
                .foregroundStyle(.white.opacity(0.3))
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.7))
            Spacer()
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }
}
