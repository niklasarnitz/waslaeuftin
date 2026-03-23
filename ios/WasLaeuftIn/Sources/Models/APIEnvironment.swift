import Foundation

enum APIEnvironment: String, CaseIterable {
    case production
    case development
    case custom

    var title: String {
        switch self {
        case .production:
            return "Production"
        case .development:
            return "Development"
        case .custom:
            return "Custom"
        }
    }

    var baseURL: String {
        switch self {
        case .production:
            return "https://waslaeuft.in"
        case .development:
            return "http://localhost:3000"
        case .custom:
            return ""
        }
    }
}
