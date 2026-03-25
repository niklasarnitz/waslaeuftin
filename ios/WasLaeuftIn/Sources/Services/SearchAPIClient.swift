import Foundation

struct SearchAPIClient {
    func search(baseURLString: String, query: String) async throws -> SearchResponse {
        guard var components = URLComponents(string: baseURLString) else {
            throw HomepageAPIError.invalidURL
        }

        components.path = "/api/search"
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
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
            return try JSONDecoder().decode(SearchResponse.self, from: data)
        } catch {
            throw HomepageAPIError.invalidResponse
        }
    }
}
