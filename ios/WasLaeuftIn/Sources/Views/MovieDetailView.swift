import SwiftUI

struct MovieDetailView: View {
    let movie: HomepageResponse.Movie
    @Environment(\.openURL) private var openURL

    private static let knownTags: Set<String> = [
        "imax",
        "omu",
        "omu spezial",
        "d-box",
        "atmos",
    ]

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    var body: some View {
        ZStack {
            AppGradient.background
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    posterView

                    Text("\(movie.showingsCount) Vorstellungen in \(movie.cinemas.count) Kinos")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.7))

                    // Cinema sections
                    ForEach(movie.cinemas) { entry in
                        cinemaSection(entry: entry)
                    }
                }
                .padding(16)
            }
        }
        .navigationTitle(movie.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private var posterView: some View {
        HStack {
            Spacer()

            AsyncImage(url: URL(string: movie.coverUrl ?? "")) { image in
                image
                    .resizable()
                    .scaledToFit()
            } placeholder: {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .overlay {
                        Image(systemName: "film")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                    }
            }
            .aspectRatio(2 / 3, contentMode: .fit)
            .frame(maxWidth: 240)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.white.opacity(0.14), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.25), radius: 18, y: 8)

            Spacer()
        }
    }

    private func cinemaSection(entry: HomepageResponse.MovieCinemaEntry) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.cinema.name)
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text(entry.cinema.city.name)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.7))
                }
                Spacer()
                Text("\(entry.cinema.distanceKm, format: .number.precision(.fractionLength(1))) km")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.orange)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.orange.opacity(0.16), in: Capsule())
            }

            showingTimesGrid(showings: entry.showings)
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
        let destinationURL = normalizedURL(from: showing.href)
        let mergedTags = mergedTagParts(for: showing)

        let content = HStack(spacing: 4) {
            Text(Self.timeFormatter.string(from: showing.dateTime))
                .font(.subheadline.weight(.semibold).monospacedDigit())
                .foregroundStyle(.white)

            if destinationURL != nil {
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.cyan)
            }

            if !mergedTags.tags.isEmpty || !mergedTags.otherParts.isEmpty {
                HStack(spacing: 3) {
                    ForEach(mergedTags.tags, id: \.self) { tag in
                        Text(tag.uppercased())
                            .font(.system(size: 9, weight: .semibold, design: .rounded))
                            .foregroundStyle(.cyan)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.cyan.opacity(0.15), in: Capsule())
                    }

                    ForEach(mergedTags.otherParts, id: \.self) { part in
                        Text(part)
                            .font(.system(size: 9, weight: .medium, design: .rounded))
                            .foregroundStyle(.white.opacity(0.75))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.white.opacity(0.08), in: Capsule())
                            .overlay(
                                Capsule().stroke(Color.white.opacity(0.18), lineWidth: 1)
                            )
                    }
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .contentShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

        if let url = destinationURL {
            Button {
                openURL(url)
            } label: {
                content
            }
            .buttonStyle(.plain)
        } else {
            content
        }
    }

    private func normalizedURL(from rawValue: String?) -> URL? {
        guard let rawValue else { return nil }

        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed != "#" else { return nil }

        if let url = URL(string: trimmed), url.scheme != nil {
            return url
        }

        let prefixed = "https://\(trimmed)"
        if let encoded = prefixed.addingPercentEncoding(withAllowedCharacters: .urlFragmentAllowed) {
            return URL(string: encoded)
        }

        return URL(string: prefixed)
    }

    private func mergedTagParts(for showing: HomepageResponse.Showing) -> (tags: [String], otherParts: [String]) {
        let titleTags = showing.tags ?? []
        let additionalData = showing.showingAdditionalData ?? []

        var matchedTags: [String] = []
        var otherParts: [String] = []

        for part in additionalData {
            let trimmed = part.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }

            if Self.knownTags.contains(trimmed.lowercased()) {
                matchedTags.append(trimmed)
            } else {
                otherParts.append(trimmed)
            }
        }

        var seen = Set<String>()
        var merged: [String] = []

        for tag in titleTags + matchedTags {
            let trimmed = tag.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }

            let key = trimmed.lowercased()
            if !seen.contains(key) {
                seen.insert(key)
                merged.append(trimmed)
            }
        }

        return (
            merged.sorted { $0.localizedCaseInsensitiveCompare($1) == .orderedAscending },
            otherParts
        )
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (positions: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth, currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
        }

        let totalHeight = currentY + lineHeight
        return (positions, CGSize(width: maxWidth, height: totalHeight))
    }
}
