import SwiftUI

struct ProjectVoiceView: View {
  @Environment(APIClient.self) private var api
  @Environment(\.dismiss) private var dismiss
  @Environment(\.scenePhase) private var scenePhase
  @State private var store = ProjectVoiceStore()
  @State private var confirmClose = false
  let onSaved: (String) -> Void

  var body: some View {
    NavigationStack {
      Form {
        if let content = store.content {
          Section("Review your brief") {
            Text(
              "Check the details. Saving creates a private draft, not a published project. You can edit every field in the draft editor."
            )
            reviewField("Title", keyPath: \.title).accessibilityIdentifier("voice.title")
            AppField(title: "Description") {
              TextField(
                "Description", text: binding(\.description),
                prompt: Text("Describe your project").foregroundStyle(Theme.muted), axis: .vertical
              )
              .lineLimit(4...12).accessibilityLabel("Description")
            }
            reviewField("City", keyPath: \.city)
            reviewField("Technologies", keyPath: \.essentialTechnologies)
            reviewField("Causes and interests", keyPath: \.interests)
            reviewField("Hours per week", keyPath: \.minimumWeeklyHours).keyboardType(.numberPad)
            reviewField("Expected commitment", keyPath: \.commitment)
            Text(
              content.kind.isEmpty
                ? "Opportunity type still needs your choice." : "Opportunity type: \(content.kind)")
            if !content.compensation.isEmpty { Text("Compensation: \(content.compensation)") }
            Text(
              content.remote
                ? "Open to remote developers" : "Review remote availability in the draft editor.")
          }.disabled(store.busy)
          Section {
            Button("Save private draft") {
              Task { if let id = await store.save(api: api) { onSaved(id) } }
            }.buttonStyle(AppButtonStyle.primary).buttonLoading(store.busy)
              .accessibilityIdentifier("voice.save")
          }
        } else {
          Section {
            Text("Talk through your project").font(Theme.title(28))
            Text(
              "When you start, ElevenLabs processes your audio for a live conversation. AI can make mistakes. Your transcript is sent for AI summarization only when you choose Review brief. Nothing is published automatically."
            )
            Text(
              store.connecting
                ? "Connecting…"
                : store.active
                  ? (store.muted ? "Microphone muted" : "Conversation live") : "Microphone off"
            )
            .foregroundStyle(Theme.muted)
            if store.active {
              Button(store.muted ? "Unmute microphone" : "Mute microphone") {
                Task { await store.toggleMute() }
              }
              Button("End conversation") { Task { await store.stop() } }
            } else {
              Button(store.messages.isEmpty ? "Start conversation" : "Continue with a new session")
              { store.start(api: api) }
              .buttonStyle(AppButtonStyle.primary).buttonLoading(store.connecting)
              .disabled(store.busy || store.stopping).accessibilityIdentifier("voice.start")
            }
            if store.connecting {
              Button("Cancel connection") { Task { await store.stop() } }
            }
          }
          if !store.messages.isEmpty {
            Section("Transcript") {
              ForEach(Array(store.messages.enumerated()), id: \.offset) { _, message in
                VStack(alignment: .leading, spacing: 6) {
                  Text(message.role == "user" ? "You" : "Project assistant").font(Theme.caption)
                    .foregroundStyle(Theme.muted)
                  Text(message.content).textSelection(.enabled)
                }
              }
            }
          }
          if store.messages.contains(where: { $0.role == "user" && !$0.content.isEmpty }) {
            Section {
              Button("Review brief") { Task { await store.review(api: api) } }
                .buttonStyle(AppButtonStyle.primary).buttonLoading(store.busy)
              Button("Use my transcript without AI summary") {
                Task { await store.useTranscript() }
              }.disabled(store.busy)
            }.disabled(store.stopping)
          }
          Section {
            Button("Write my project instead") { confirmClose = true }.disabled(store.busy)
          }
        }
        if let error = store.error { Section { FailureView(error: error) } }
      }
      .pageBackground()
      .appNavigationTitle(store.content == nil ? "Project conversation" : "Review brief")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Close") { confirmClose = true }.disabled(store.busy)
        }
      }
      .sheet(isPresented: $confirmClose) {
        AppDialog(
          title: "Leave this conversation?",
          message:
            "The transcript and unsaved brief stay only on this screen until you save a private draft."
        ) {
          Button("Leave without saving", role: .destructive) {
            Task {
              await store.stop()
              confirmClose = false
              dismiss()
            }
          }.buttonStyle(AppButtonStyle(variant: .destructive, fullWidth: true))
          Button("Keep reviewing") { confirmClose = false }.buttonStyle(
            AppButtonStyle(fullWidth: true))
        }
      }
      .interactiveDismissDisabled()
      .onChange(of: scenePhase) { _, phase in
        if phase == .background || (phase == .inactive && store.active) {
          Task { await store.stop() }
        }
      }
      .onDisappear { Task { await store.stop() } }
    }
  }

  private func binding(_ keyPath: WritableKeyPath<ProjectDraftContent, String>) -> Binding<String> {
    Binding(
      get: { store.content?[keyPath: keyPath] ?? "" },
      set: { store.content?[keyPath: keyPath] = $0 })
  }

  private func reviewField(_ title: String, keyPath: WritableKeyPath<ProjectDraftContent, String>)
    -> some View
  {
    AppField(title: title) {
      TextField(title, text: binding(keyPath), prompt: Text(title).foregroundStyle(Theme.muted))
        .accessibilityLabel(title)
    }
  }
}
