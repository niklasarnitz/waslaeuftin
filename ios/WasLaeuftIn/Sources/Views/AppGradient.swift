import SwiftUI

enum AppGradient {
    static let background = LinearGradient(
        colors: [
            Color(red: 0.07, green: 0.09, blue: 0.16),
            Color(red: 0.09, green: 0.15, blue: 0.24),
            Color(red: 0.06, green: 0.28, blue: 0.35),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
