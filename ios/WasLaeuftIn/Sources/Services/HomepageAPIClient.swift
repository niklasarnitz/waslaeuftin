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

struct HomepageAPIClient: Sendable {
    func fetchHomepage(
        baseURLString: String,
        latitude: Double,
        longitude: Double,
        radiusKm: Double,
        date: Date? = nil
    ) async throws -> HomepageResponse {

        // Build URL
        guard var components = URLComponents(string: baseURLString) else {
            throw HomepageAPIError.invalidURL
        }

        components.path = "/api/homepage"

        var queryItems = [
            URLQueryItem(name: "latitude", value: String(latitude)),
            URLQueryItem(name: "longitude", value: String(longitude)),
            URLQueryItem(name: "maxDistanceKm", value: String(Int(radiusKm))),
        ]

        if let date {
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withInternetDateTime]
            queryItems.append(
                URLQueryItem(name: "date", value: dateFormatter.string(from: date))
            )
        }

        components.queryItems = queryItems

        guard let url = components.url else {
            throw HomepageAPIError.invalidURL
        }

        // Network request
        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw HomepageAPIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw HomepageAPIError.serverError(statusCode: httpResponse.statusCode)
        }

        // Decoder (inlined, concurrency-safe)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            // Try with fractional seconds first
            let formatterWithFractional = ISO8601DateFormatter()
            formatterWithFractional.formatOptions = [
                .withInternetDateTime,
                .withFractionalSeconds
            ]

            if let date = formatterWithFractional.date(from: dateString) {
                return date
            }

            // Fallback without fractional seconds
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime]

            if let date = formatter.date(from: dateString) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Date string does not match ISO-8601 formats"
            )
        }

        // Decode response
        do {
            return try decoder.decode(HomepageResponse.self, from: data)
        } catch {
            throw HomepageAPIError.invalidResponse
        }
    }
}
