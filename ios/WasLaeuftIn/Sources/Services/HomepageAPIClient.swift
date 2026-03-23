import Foundation

enum HomepageAPIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Die API-URL ist ungueltig."
        case .invalidResponse:
            return "Die API hat ungueltige Daten geliefert."
        case .serverError(let statusCode):
            return "Die API-Anfrage ist fehlgeschlagen (HTTP \(statusCode))."
        }
    }
}

struct HomepageAPIClient {
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()

        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

            if let date = formatter.date(from: dateString) {
                return date
            }

            let fallbackFormatter = ISO8601DateFormatter()
            fallbackFormatter.formatOptions = [.withInternetDateTime]
            if let date = fallbackFormatter.date(from: dateString) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Date string does not match ISO-8601 formats"
            )
        }

        return decoder
    }()

    func fetchHomepage(
        baseURLString: String,
        latitude: Double,
        longitude: Double,
        radiusKm: Double,
        limit: Int
    ) async throws -> HomepageResponse {
        guard var components = URLComponents(string: baseURLString) else {
            throw HomepageAPIError.invalidURL
        }

        components.path = "/api/homepage"
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(latitude)),
            URLQueryItem(name: "longitude", value: String(longitude)),
            URLQueryItem(name: "maxDistanceKm", value: String(Int(radiusKm))),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        guard let url = components.url else {
            throw HomepageAPIError.invalidURL
        }

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw HomepageAPIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw HomepageAPIError.serverError(statusCode: httpResponse.statusCode)
        }

        do {
            return try decoder.decode(HomepageResponse.self, from: data)
        } catch {
            throw HomepageAPIError.invalidResponse
        }
    }
}
