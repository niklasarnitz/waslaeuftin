import Foundation

struct SearchResponse: Codable {
    let cities: [SearchCity]
    let cinemas: [SearchCinema]

    struct SearchCity: Codable, Identifiable {
        let id: Int
        let name: String
        let slug: String
    }

    struct SearchCinema: Codable, Identifiable {
        let id: Int
        let name: String
        let slug: String
        let city: CinemaCity
    }

    struct CinemaCity: Codable {
        let name: String
    }
}
