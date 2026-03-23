import SwiftUI

struct CinemaCardView: View {
    let cinema: HomepageResponse.Cinema

    var body: some View {
        NavigationLink {
            CinemaDetailView(cinema: cinema)
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(cinema.name)
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text(cinema.city.name)
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.7))
                    }
                    Spacer()
                    Text("\(cinema.distanceKm, format: .number.precision(.fractionLength(1))) km")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.orange)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.orange.opacity(0.16), in: Capsule())
                }

                Text("\(cinema.movies.count) Filme heute")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))

                let topMovieNames = cinema.movies.prefix(3).map(\.name)
                if !topMovieNames.isEmpty {
                    Text(topMovieNames.joined(separator: " · "))
                        .font(.footnote)
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
