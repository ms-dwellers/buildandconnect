import Foundation
import Observation

struct ProjectDraftContent: Codable, Equatable {
  struct DraftPin: Codable, Equatable {
    var latitude: Double
    var longitude: Double
    var place: String
  }
  var title = ""
  var description = ""
  var city = ""
  var kind = ""
  var remote = false
  var collaboration = "flexible"
  var essentialTechnologies = ""
  var interests = ""
  var minimumWeeklyHours = ""
  var compensation = ""
  var commitment = ""
  var place = ""
  var pin: DraftPin?

  enum CodingKeys: String, CodingKey {
    case title, description, city, kind, remote, collaboration, essentialTechnologies, interests
    case minimumWeeklyHours, compensation, commitment, place, pin
  }
  func encode(to encoder: Encoder) throws {
    var values = encoder.container(keyedBy: CodingKeys.self)
    try values.encode(title, forKey: .title)
    try values.encode(description, forKey: .description)
    try values.encode(city, forKey: .city)
    try values.encode(kind, forKey: .kind)
    try values.encode(remote, forKey: .remote)
    try values.encode(collaboration, forKey: .collaboration)
    try values.encode(essentialTechnologies, forKey: .essentialTechnologies)
    try values.encode(interests, forKey: .interests)
    try values.encode(minimumWeeklyHours, forKey: .minimumWeeklyHours)
    try values.encode(compensation, forKey: .compensation)
    try values.encode(commitment, forKey: .commitment)
    try values.encode(place, forKey: .place)
    try values.encode(pin, forKey: .pin)
  }

  var readyToPublish: Bool {
    !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && description.trimmingCharacters(in: .whitespacesAndNewlines).count >= 30
      && !city.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && ["paid", "volunteer"].contains(kind)
      && (Int(minimumWeeklyHours).map { (1...80).contains($0) } ?? false)
  }
}

struct ProjectDraft: Codable, Identifiable {
  let id: String
  let content: ProjectDraftContent
  let updatedAt: Int
  let publishedOpportunityId: String?
}

/// One serialized save loop owns revisions, even if a newer edit cancels its debounce.
@MainActor @Observable final class ProjectDraftStore {
  let id: String
  var content = ProjectDraftContent()
  private(set) var record: ProjectDraft?
  private(set) var loading = false
  private(set) var saving = false
  private(set) var performingAction = false
  private(set) var conflict = false
  private(set) var discarded = false
  private(set) var error: Error?
  @ObservationIgnored private let api: APIClient
  @ObservationIgnored private var debounce: Task<Void, Never>?
  @ObservationIgnored private var saveTask: Task<Bool, Never>?

  init(id: String, api: APIClient) {
    self.id = id
    self.api = api
  }
  var dirty: Bool { record != nil && record?.content != content }
  var publishedID: String? { record?.publishedOpportunityId }

  func load() async {
    guard !loading, !saving, !performingAction, saveTask == nil else { return }
    debounce?.cancel()
    loading = true
    defer { loading = false }
    do {
      let result: ProjectDraft = try await api.get("/project-drafts/\(id)")
      record = result
      content = result.content
      conflict = false
      error = nil
    } catch { self.error = error }
  }

  func scheduleSave() {
    debounce?.cancel()
    guard dirty, !conflict, !discarded, publishedID == nil, !performingAction else { return }
    debounce = Task { [weak self] in
      do { try await Task.sleep(for: .milliseconds(700)) } catch { return }
      _ = await self?.flush()
    }
  }

  func saveNow() async -> Bool {
    debounce?.cancel()
    return await flush()
  }

  private func flush() async -> Bool {
    if let saveTask {
      guard await saveTask.value else { return false }
      if !dirty { return true }
    }
    guard !conflict, !discarded, publishedID == nil, record != nil else { return false }
    let task = Task {
      let result = await persistChanges()
      saveTask = nil
      return result
    }
    saveTask = task
    return await task.value
  }

  private func persistChanges() async -> Bool {
    saving = true
    defer { saving = false }
    struct Save: Encodable {
      let content: ProjectDraftContent
      let expectedUpdatedAt: Int
    }
    while dirty, let current = record {
      let snapshot = content
      do {
        let saved: ProjectDraft = try await api.send(
          "/project-drafts/\(id)", method: "PUT",
          body: Save(content: snapshot, expectedUpdatedAt: current.updatedAt))
        record = saved
        error = nil
      } catch {
        self.error = error
        conflict = (error as? APIError)?.status == 409
        return false
      }
    }
    return true
  }

  func publish() async -> String? {
    guard !performingAction else { return nil }
    performingAction = true
    defer { performingAction = false }
    if let publishedID { return publishedID }
    guard await saveNow(), let current = record else { return nil }
    do {
      let result: Created = try await api.send(
        "/project-drafts/\(id)/publish",
        body: ["expectedUpdatedAt": current.updatedAt])
      await recoverPublishedState()
      error = nil
      return result.id
    } catch {
      if let failure = error as? APIError, failure.status == 503 {
        self.error = APIError(
          status: 503,
          message: "Publishing is unavailable. Your private draft is saved; try again later.")
      } else {
        self.error = error
      }
      conflict = (error as? APIError)?.status == 409
      // A lost response can follow successful publication. Recover its linked ID without retrying AI.
      await recoverPublishedState()
      return publishedID
    }
  }

  private func recoverPublishedState() async {
    if let latest: ProjectDraft = try? await api.get("/project-drafts/\(id)"),
      latest.publishedOpportunityId != nil
    {
      record = latest
      content = latest.content
      conflict = false
    }
  }

  func discard() async -> Bool {
    guard !performingAction else { return false }
    performingAction = true
    defer { performingAction = false }
    debounce?.cancel()
    if let saveTask { _ = await saveTask.value }
    guard !conflict, let current = record, publishedID == nil else { return false }
    do {
      try await api.mutate(
        "/project-drafts/\(id)", method: "DELETE",
        body: ["expectedUpdatedAt": current.updatedAt])
      discarded = true
      error = nil
      return true
    } catch {
      self.error = error
      conflict = (error as? APIError)?.status == 409
      return false
    }
  }

  func saveOnDeparture() {
    guard dirty, !discarded, publishedID == nil, !performingAction else { return }
    Task { _ = await saveNow() }
  }
}
