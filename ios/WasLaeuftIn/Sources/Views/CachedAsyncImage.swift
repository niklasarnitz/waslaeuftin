import SwiftUI
import UIKit

private final class ImageMemoryCache {
    nonisolated(unsafe) static let shared = ImageMemoryCache()

    private let cache = NSCache<NSURL, UIImage>()

    private init() {
        cache.countLimit = 500
    }

    func image(for url: URL) -> UIImage? {
        cache.object(forKey: url as NSURL)
    }

    func insert(_ image: UIImage, for url: URL) {
        cache.setObject(image, forKey: url as NSURL)
    }
}

@MainActor
private final class CachedImageLoader: ObservableObject {
    @Published var image: UIImage?

    private var task: Task<Void, Never>?

    deinit {
        task?.cancel()
    }

    func load(from url: URL?) {
        task?.cancel()
        image = nil

        guard let url else {
            return
        }

        if let cachedImage = ImageMemoryCache.shared.image(for: url) {
            image = cachedImage
            return
        }

        task = Task {
            var request = URLRequest(url: url)
            request.cachePolicy = .returnCacheDataElseLoad
            request.timeoutInterval = 30

            do {
                let (data, response) = try await URLSession.shared.data(for: request)

                guard !Task.isCancelled else { return }

                if let httpResponse = response as? HTTPURLResponse,
                   !(200...299).contains(httpResponse.statusCode) {
                    return
                }

                guard let decoded = UIImage(data: data) else {
                    return
                }

                ImageMemoryCache.shared.insert(decoded, for: url)
                image = decoded
            } catch {
                // Keep placeholder on failure.
            }
        }
    }
}

struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    @ViewBuilder let content: (Image) -> Content
    @ViewBuilder let placeholder: () -> Placeholder

    @StateObject private var loader = CachedImageLoader()

    var body: some View {
        Group {
            if let uiImage = loader.image {
                content(Image(uiImage: uiImage))
            } else {
                placeholder()
            }
        }
        .task(id: url) {
            loader.load(from: url)
        }
    }
}
