import AVFoundation
import Combine
import ElevenLabs
import Foundation
import Observation

struct ProjectVoiceMessage: Codable {
  let role: String
  let content: String
}

private struct ProjectVoiceBrief: Decodable {
  struct Compensation: Decodable {
    let kind: String?
    let currency: String?
    let period: String?
    let minimum: Double?
    let maximum: Double?
  }
  let title: String?
  let description: String?
  let technologies: [String]
  let causes: [String]
  let communitiesServed: [String]
  let workArrangement: String?
  let location: String?
  let weeklyHours: Int?
  let timeline: String?
  let compensation: Compensation

  var draft: ProjectDraftContent {
    var result = ProjectDraftContent()
    result.title = title ?? ""
    result.description = description ?? ""
    result.city = location ?? ""
    result.kind = compensation.kind ?? ""
    result.remote = workArrangement == "remote"
    result.essentialTechnologies = technologies.joined(separator: ", ")
    result.interests = (causes + communitiesServed).joined(separator: ", ")
    result.minimumWeeklyHours = weeklyHours.map(String.init) ?? ""
    result.commitment = timeline ?? ""
    result.compensation = [
      compensation.currency,
      compensation.minimum.map { String($0) },
      compensation.maximum.map { "to \($0)" },
      compensation.period.map { "per \($0)" },
    ].compactMap { $0 }.joined(separator: " ")
    return result
  }
}

@MainActor @Observable final class ProjectVoiceStore {
  var messages: [ProjectVoiceMessage] = []
  var content: ProjectDraftContent?
  private(set) var connecting = false
  private(set) var stopping = false
  private(set) var active = false
  private(set) var muted = false
  private(set) var busy = false
  private(set) var error: Error?
  @ObservationIgnored private var conversation: Conversation?
  @ObservationIgnored private var subscriptions = Set<AnyCancellable>()
  @ObservationIgnored private var connectionTask: Task<Void, Never>?
  @ObservationIgnored private var generation = 0
  @ObservationIgnored private let draftID = UUID().uuidString.lowercased()

  func start(api: APIClient) {
    guard !connecting, !active, !busy, !stopping else { return }
    connecting = true
    error = nil
    generation += 1
    let current = generation
    connectionTask = Task { [self] in
      defer { if current == generation { connecting = false } }
      do {
        await conversation?.endConversation()
        subscriptions.removeAll()
        conversation = nil
        try Task.checkCancellation()
        struct Status: Decodable { let conversation: Bool }
        let status: Status = try await api.get("/hiring/status")
        guard status.conversation else {
          throw APIError(
            status: 503,
            message: "Voice is not configured yet. Retry later or write your project instead.")
        }
        guard await AVAudioApplication.requestRecordPermission() else {
          throw APIError(
            status: 0,
            message:
              "Microphone access is off. Enable it in Settings or write your project instead.")
        }
        try Task.checkCancellation()
        struct Token: Decodable { let token: String }
        let token: Token = try await api.send(
          "/hiring/native-voice-session", body: [String: String]())
        let session = try await ElevenLabs.startConversation(conversationToken: token.token)
        guard current == generation, !Task.isCancelled else {
          await session.endConversation()
          return
        }
        conversation = session
        active = true
        let previous = messages
        session.$messages.sink { [weak self] incoming in
          self?.messages =
            previous
            + incoming.map {
              ProjectVoiceMessage(
                role: $0.role == .user ? "user" : "assistant", content: $0.content)
            }
        }.store(in: &subscriptions)
        session.$state.sink { [weak self] state in
          self?.active = state.isActive
          if case .error = state {
            self?.error = APIError(
              status: 0,
              message: "Voice disconnected. Your transcript is still here. Retry or review it.")
          }
        }.store(in: &subscriptions)
        session.$isMuted.sink { [weak self] in self?.muted = $0 }.store(in: &subscriptions)
      } catch is CancellationError {
      } catch {
        if current == generation {
          self.error =
            (error as? APIError)
            ?? APIError(
              status: 0, message: "Could not connect to voice. Retry or write your project instead."
            )
        }
      }
    }
  }

  func stop() async {
    guard !stopping else { return }
    stopping = true
    defer { stopping = false }
    generation += 1
    let pending = connectionTask
    pending?.cancel()
    connectionTask = nil
    connecting = false
    active = false
    let session = conversation
    conversation = nil
    await session?.endConversation()
    await pending?.value
    subscriptions.removeAll()
  }

  func toggleMute() async {
    do { try await conversation?.toggleMute() } catch {
      self.error = APIError(
        status: 0, message: "Could not change the microphone. End the conversation and retry.")
    }
  }

  func review(api: APIClient) async {
    guard !busy else { return }
    busy = true
    error = nil
    await stop()
    defer { busy = false }
    do {
      struct Input: Encodable { let messages: [ProjectVoiceMessage] }
      struct Result: Decodable { let brief: ProjectVoiceBrief }
      guard messages.count <= 24, messages.allSatisfy({ $0.content.count <= 3000 }) else {
        throw APIError(
          status: 0,
          message:
            "This conversation is too long to summarize. Use the transcript as a draft instead.")
      }
      let result: Result = try await api.send("/hiring/brief", body: Input(messages: messages))
      content = result.brief.draft
    } catch { self.error = error }
  }

  func useTranscript() async {
    guard !busy, !stopping else { return }
    busy = true
    defer { busy = false }
    await stop()
    var draft = ProjectDraftContent()
    draft.description = messages.filter { $0.role == "user" }.map(\.content).joined(
      separator: "\n\n")
    content = draft
    error = nil
  }

  func save(api: APIClient) async -> String? {
    guard !busy, let content else { return nil }
    busy = true
    error = nil
    defer { busy = false }
    do {
      struct Input: Encodable {
        let id: String
        let content: ProjectDraftContent
      }
      let draft: ProjectDraft = try await api.send(
        "/project-drafts", body: Input(id: draftID, content: content))
      return draft.id
    } catch {
      self.error = error
      return nil
    }
  }
}
