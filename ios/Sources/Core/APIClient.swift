import Foundation
import Observation
import Security

struct APIError: LocalizedError, Equatable {
  struct Issue: Decodable, Equatable {
    let path: [PathPart]
    let message: String
    enum PathPart: Decodable, Equatable {
      case text(String)
      case index(Int)
      init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let text = try? container.decode(String.self) {
          self = .text(text)
        } else {
          self = .index(try container.decode(Int.self))
        }
      }
      var label: String {
        switch self {
        case .text(let text): text
        case .index(let index): String(index)
        }
      }
    }
    var field: String { path.map(\.label).joined(separator: ".") }
  }
  let status: Int
  let message: String
  var issues: [Issue] = []
  var errorDescription: String? { message }
}

enum SessionKeychain {
  private static let service = "org.buildandconnect.session"
  static func read(account: String) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service, kSecAttrAccount as String: account,
      kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
      let data = item as? Data
    else { return nil }
    return String(data: data, encoding: .utf8)
  }
  static func write(_ token: String?, account: String) throws {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service, kSecAttrAccount as String: account,
    ]
    guard let token else {
      SecItemDelete(query as CFDictionary)
      return
    }
    let attributes: [String: Any] = [
      kSecValueData as String: Data(token.utf8),
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]
    var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    if status == errSecItemNotFound {
      status = SecItemAdd(query.merging(attributes) { _, value in value } as CFDictionary, nil)
    }
    guard status == errSecSuccess else {
      throw APIError(
        status: 0, message: "Unable to secure your session. Unlock this device and try again.")
    }
  }
}

@MainActor @Observable final class APIClient {
  private struct Failure: Decodable {
    let error: String?
    let message: String?
    let issues: [APIError.Issue]?
  }
  let baseURL: URL
  private let session: URLSession
  private(set) var token: String?
  private var credentialGeneration = 0
  var sessionExpired = false
  init(baseURL: URL, session: URLSession? = nil, restoreSession: Bool = true) {
    self.baseURL = baseURL
    let configuration = URLSessionConfiguration.ephemeral
    configuration.httpShouldSetCookies = false
    configuration.httpCookieStorage = nil
    configuration.urlCache = nil
    configuration.timeoutIntervalForRequest = 45
    self.session = session ?? URLSession(configuration: configuration)
    self.token = restoreSession ? SessionKeychain.read(account: baseURL.absoluteString) : nil
  }

  func clearSession() {
    credentialGeneration += 1
    try? SessionKeychain.write(nil, account: baseURL.absoluteString)
    token = nil
    sessionExpired = false
  }

  func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
    try await request(path, method: "GET", body: nil, query: query)
  }

  func send<T: Decodable, Body: Encodable>(
    _ path: String, method: String = "POST", body: Body, idempotencyKey: String? = nil,
    expectedRevision: Int? = nil
  )
    async throws -> T
  {
    try await request(
      path, method: method, body: JSONEncoder().encode(body), idempotencyKey: idempotencyKey,
      expectedRevision: expectedRevision)
  }

  func mutate<Body: Encodable>(
    _ path: String, method: String = "POST", body: Body, expectedRevision: Int? = nil
  ) async throws {
    let _: EmptyResponse = try await send(
      path, method: method, body: body, expectedRevision: expectedRevision)
  }

  private func request<T: Decodable>(
    _ path: String, method: String, body: Data?,
    query: [String: String] = [:], idempotencyKey: String? = nil,
    expectedRevision: Int? = nil
  ) async throws -> T {
    guard baseURL.host != "configuration-required.invalid" else {
      throw APIError(
        status: 0,
        message:
          "Set API_BASE_URL to your Convex HTTP site in ios/Local.xcconfig, then rebuild the app.")
    }
    guard path.hasPrefix("/"), !path.contains(".."), !path.contains("?") else {
      throw APIError(status: 0, message: "Invalid API route.")
    }
    #if !DEBUG
      guard baseURL.scheme == "https" else {
        throw APIError(status: 0, message: "A secure server URL is required.")
      }
    #endif
    var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
    components.path = "/api" + path
    if !query.isEmpty {
      components.queryItems = query.sorted { $0.key < $1.key }.map(URLQueryItem.init)
    }
    guard let url = components.url else { throw URLError(.badURL) }
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.httpBody = body
    if let idempotencyKey {
      request.setValue(idempotencyKey, forHTTPHeaderField: "Idempotency-Key")
    }
    if let expectedRevision {
      request.setValue("\"\(expectedRevision)\"", forHTTPHeaderField: "If-Match")
    }
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    var origin = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
    origin.path = ""
    origin.query = nil
    origin.fragment = nil
    request.setValue(origin.string, forHTTPHeaderField: "Origin")
    if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
    if let body, body.count > 32 * 1024 {
      throw APIError(
        status: 413,
        message: "This submission exceeds 32 KB. Shorten the descriptions and try again.")
    }
    let generation = credentialGeneration
    let (data, response) = try await session.data(for: request)
    guard generation == credentialGeneration else { throw CancellationError() }
    guard let response = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
    guard (200..<300).contains(response.statusCode) else {
      let failure = try? JSONDecoder().decode(Failure.self, from: data)
      if response.statusCode == 401 && token != nil { sessionExpired = true }
      throw APIError(
        status: response.statusCode,
        message: failure?.error ?? failure?.message ?? "Unable to complete the request. Try again.",
        issues: failure?.issues ?? [])
    }
    if let newToken = response.value(forHTTPHeaderField: "set-auth-token"), !newToken.isEmpty {
      try SessionKeychain.write(newToken, account: baseURL.absoluteString)
      if newToken != token { credentialGeneration += 1 }
      token = newToken
      sessionExpired = false
    }
    return try JSONDecoder().decode(T.self, from: data)
  }
}

@MainActor @Observable final class Resource<Value: Decodable> {
  var value: Value?
  var error: Error?
  var loading = false
  func load(_ api: APIClient, _ path: String, query: [String: String] = [:]) async {
    guard !loading else { return }
    loading = true
    defer { loading = false }
    do {
      let result: Value = try await api.get(path, query: query)
      try Task.checkCancellation()
      value = result
      error = nil
    } catch is CancellationError {} catch let failure as URLError where failure.code == .cancelled {
    } catch {
      if let failure = error as? APIError, [401, 403, 404].contains(failure.status) { value = nil }
      self.error = error
    }
  }
}

@MainActor @Observable final class PageStore<Item: Decodable & Identifiable>
where Item.ID: Hashable {
  var items: [Item] = []
  var nextCursor: String?
  var error: Error?
  var loading = false
  var loaded = false
  func load(_ api: APIClient, _ path: String, reset: Bool = true, query: [String: String] = [:])
    async
  {
    guard !loading, reset || nextCursor != nil else { return }
    loading = true
    defer { loading = false }
    var parameters = query
    parameters["limit"] = "50"
    if !reset { parameters["after"] = nextCursor }
    do {
      let page: Page<Item> = try await api.get(path, query: parameters)
      try Task.checkCancellation()
      if reset {
        items = page.data
      } else {
        let existing = Set(items.map(\.id))
        items += page.data.filter { !existing.contains($0.id) }
      }
      nextCursor = page.nextCursor
      error = nil
      loaded = true
    } catch is CancellationError {} catch let failure as URLError where failure.code == .cancelled {
    } catch {
      if let failure = error as? APIError, [401, 403, 404].contains(failure.status) {
        items = []
        nextCursor = nil
      }
      self.error = error
    }
  }
}

@MainActor @Observable final class ActionState {
  var busy = false
  var error: Error?
  func run(_ operation: () async throws -> Void) async {
    guard !busy else { return }
    busy = true
    defer { busy = false }
    do {
      try await operation()
      error = nil
    } catch is CancellationError {} catch { self.error = error }
  }
}
