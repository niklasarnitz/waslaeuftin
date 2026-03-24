import SwiftUI

struct MovieCardView: View {
    let movie: HomepageResponse.Movie

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
        NavigationLink {
            MovieDetailView(movie: movie)
        } label: {
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
                    .frame(width: 80, height: 120)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                    VStack(alignment: .leading, spacing: 6) {
                        Text(movie.name)
                            .font(.headline)
                            .foregroundStyle(.white)
                            .lineLimit(nil)
                            .fixedSize(horizontal: false, vertical: true)
                            .multilineTextAlignment(.leading)

                        Text("\(movie.showingsCount) Vorstellungen in \(movie.cinemas.count) Kinos")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.7))

                        if let nextShowing = movie.nextShowing {
                            Label(Self.formatShowingTime(nextShowing.dateTime), systemImage: "clock.fill")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.cyan)
                        }
                    }
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(movie.cinemas) { entry in
                            Text(entry.cinema.name)
                                .font(.caption)
                                .foregroundStyle(.cyan)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.cyan.opacity(0.14), in: Capsule())
                        }
                    }
                }
            }
            .padding(14)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
