import Foundation

struct HomepageResponse: Codable {
    let location: Location
    let summary: Summary
    let cinemas: [Cinema]
    let movies: [Movie]
    let generatedAt: Date

    struct Location: Codable {
        let latitude: Double
        let longitude: Double
        let maxDistanceKm: Double
        let limit: Int?
    }

    struct Summary: Codable {
        let cinemaCount: Int
        let movieCount: Int
        let totalShowings: Int
    }

    struct Cinema: Codable, Identifiable {
        let id: Int
        let name: String
        let slug: String
        let distanceKm: Double
        let city: City
        let movies: [CinemaMovie]
    }

    struct City: Codable {
        let name: String
        let slug: String
    }

    struct CinemaMovie: Codable {
        let name: String
        let coverUrl: String?
        let tmdbMetadata: TMDBMetadata?
        let showings: [Showing]
    }

    struct TMDBMetadata: Codable {
        let popularity: Double?
    }

    struct Showing: Codable, Identifiable {
        let dateTime: Date
        let languageVersion: String?
        let notation: String?
        let ageRating: String?
        let showingAdditionalData: [String]?
        let href: String?
        let rawMovieName: String
        let tags: [String]?

        enum CodingKeys: String, CodingKey {
            case dateTime
            case languageVersion
            case notation
            case ageRating
            case showingAdditionalData
            case href
            case bookingUrl
            case rawMovieName
            case tags
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            dateTime = try container.decode(Date.self, forKey: .dateTime)
            languageVersion = try container.decodeIfPresent(String.self, forKey: .languageVersion)
            notation = try container.decodeIfPresent(String.self, forKey: .notation)
            ageRating = try container.decodeIfPresent(String.self, forKey: .ageRating)
            showingAdditionalData = try container.decodeIfPresent([String].self, forKey: .showingAdditionalData)
            href = try container.decodeIfPresent(String.self, forKey: .href)
                ?? container.decodeIfPresent(String.self, forKey: .bookingUrl)
            rawMovieName = try container.decode(String.self, forKey: .rawMovieName)
            tags = try container.decodeIfPresent([String].self, forKey: .tags)
        }

        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(dateTime, forKey: .dateTime)
            try container.encodeIfPresent(languageVersion, forKey: .languageVersion)
            try container.encodeIfPresent(notation, forKey: .notation)
            try container.encodeIfPresent(ageRating, forKey: .ageRating)
            try container.encodeIfPresent(showingAdditionalData, forKey: .showingAdditionalData)
            try container.encodeIfPresent(href, forKey: .href)
            try container.encode(rawMovieName, forKey: .rawMovieName)
            try container.encodeIfPresent(tags, forKey: .tags)
        }

        var id: String {
            let hrefPart = href ?? "-"
            return "\(rawMovieName)-\(dateTime.timeIntervalSince1970)-\(hrefPart)"
        }
    }

    struct Movie: Codable, Identifiable {
        let name: String
        let coverUrl: String?
        let tmdbPopularity: Double?
        let showingsCount: Int
        let nextShowing: Showing?
        let cinemas: [MovieCinemaEntry]

        var id: String { name }
    }

    struct MovieCinemaEntry: Codable, Identifiable {
        let cinema: MovieCinema
        let showings: [Showing]
        let nextShowing: Showing?

        var id: Int { cinema.id }
    }

    struct MovieCinema: Codable {
        let id: Int
        let name: String
        let slug: String
        let distanceKm: Double
        let city: City
    }
}
