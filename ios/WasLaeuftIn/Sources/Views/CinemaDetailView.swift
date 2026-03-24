import SwiftUI

struct CinemaDetailView: View {
    let cinema: HomepageResponse.Cinema

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    private static func formatShowingTime(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return timeFormatter.string(from: date)
        }
        let day = calendar.component(.day, from: date)
        let month = calendar.component(.month, from: date)
        let dayStr = String(format: "%02d", day)
        let monthStr = String(format: "%02d", month)
        return "\(dayStr).\(monthStr). \(timeFormatter.string(from: date))"
    }

    var body: some View {
        ZStack {
            AppGradient.background
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Header
                    VStack(alignment: .leading, spacing: 4) {
                        Text(cinema.city.name)
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.7))

                        Text("\(cinema.distanceKm, format: .number.precision(.fractionLength(1))) km entfernt")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }

                    // Movies
                    ForEach(Array(cinema.movies.enumerated()), id: \.offset) { _, movie in
                        movieSection(movie: movie)
                    }
                }
                .padding(16)
            }
        }
        .navigationTitle(cinema.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private func movieSection(movie: HomepageResponse.CinemaMovie) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                CachedAsyncImage(url: URL(string: movie.coverUrl ?? "")) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay {
                            Image(systemName: "film")
                                .foregroundStyle(.secondary)
                        }
                }
                .frame(width: 60, height: 90)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text(movie.name)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(nil)
                        .fixedSize(horizontal: false, vertical: true)

                    Text("\(movie.showings.count) Vorstellungen")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.7))
                }
            }

            showingTimesGrid(showings: movie.showings)
        }
        .padding(14)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func showingTimesGrid(showings: [HomepageResponse.Showing]) -> some View {
        FlowLayout(spacing: 8) {
            ForEach(showings) { showing in
                showingCapsule(showing: showing)
            }
        }
    }

    @ViewBuilder
    private func showingCapsule(showing: HomepageResponse.Showing) -> some View {
        let content = HStack(spacing: 4) {
            Text(Self.formatShowingTime(showing.dateTime))
                .font(.subheadline.weight(.semibold).monospacedDigit())
                .foregroundStyle(.white)

            if let lang = showing.languageVersion, !lang.isEmpty {
                Text(lang.uppercased())
                    .font(.system(size: 9).weight(.medium))
                    .foregroundStyle(.white.opacity(0.75))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.white.opacity(0.08), in: Capsule())
                    .overlay(
                        Capsule().stroke(Color.white.opacity(0.18), lineWidth: 1)
                    )
            }

            if let tags = showing.tags, !tags.isEmpty {
                HStack(spacing: 3) {
                    ForEach(tags, id: \.self) { tag in
                        Text(tag.uppercased())
                            .font(.system(size: 9, weight: .semibold, design: .rounded))
                            .foregroundStyle(.cyan)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.cyan.opacity(0.15), in: Capsule())
                    }
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

        if let href = showing.href, let url = URL(string: href) {
            Link(destination: url) {
                content
            }
        } else {
            content
        }
    }
}
