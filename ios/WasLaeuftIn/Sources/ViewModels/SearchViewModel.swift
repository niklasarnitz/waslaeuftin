import Foundation
import Combine

@MainActor
final class SearchViewModel: ObservableObject {
    @Published var query = ""
    @Published var results: SearchResponse?
    @Published var isSearching = false

    private let client = SearchAPIClient()
    private var searchTask: Task<Void, Never>?

    func search(baseURLString: String) {
        searchTask?.cancel()

        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            results = nil
            isSearching = false
            return
        }

        isSearching = true

        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }

            do {
                let response = try await client.search(
                    baseURLString: baseURLString,
                    query: trimmed
                )
                guard !Task.isCancelled else { return }
                results = response
            } catch {
                guard !Task.isCancelled else { return }
                results = nil
            }
            isSearching = false
        }
    }
}
