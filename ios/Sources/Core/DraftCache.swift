import CryptoKit
import Foundation

struct PostingDraft<Value: Codable>: Codable {
  var input: Value
  var submissionKey: String
  var selectedPin: Bool
}

enum DraftCache {
  private static var directory: URL {
    FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appending(path: "BuildConnectDrafts", directoryHint: .isDirectory)
  }
  private static func file(_ key: String) -> URL {
    let name = SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
    return directory.appending(path: name + ".json")
  }
  static func load<Value: Decodable>(_ type: Value.Type, key: String) -> Value? {
    guard let data = try? Data(contentsOf: file(key)) else { return nil }
    return try? JSONDecoder().decode(type, from: data)
  }
  static func save<Value: Encodable>(_ value: Value, key: String) throws {
    try FileManager.default.createDirectory(
      at: directory, withIntermediateDirectories: true,
      attributes: [.protectionKey: FileProtectionType.complete])
    var folder = directory
    var attributes = URLResourceValues()
    attributes.isExcludedFromBackup = true
    try folder.setResourceValues(attributes)
    try JSONEncoder().encode(value).write(
      to: file(key), options: [.atomic, .completeFileProtection])
  }
  static func remove(key: String) { try? FileManager.default.removeItem(at: file(key)) }
  static func clear() {
    guard
      let files = try? FileManager.default.contentsOfDirectory(
        at: directory, includingPropertiesForKeys: nil)
    else { return }
    for file in files where file.pathExtension == "json" {
      try? FileManager.default.removeItem(at: file)
    }
  }
}
