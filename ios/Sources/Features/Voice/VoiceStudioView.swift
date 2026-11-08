import AVFoundation
import SwiftUI

@MainActor @Observable final class MicrophoneMeter {
  private let engine = AVAudioEngine()
  private var tapped = false
  private var starting = false
  private var generation = 0
  var active = false
  var level = 0.0
  var error: String?
  func start() async {
    guard !active, !starting else { return }
    starting = true
    let requestGeneration = generation
    defer { if requestGeneration == generation { starting = false } }
    let granted = await AVAudioApplication.requestRecordPermission()
    guard requestGeneration == generation else { return }
    guard granted else {
      error = "Microphone access is off. The conversation works without it."
      return
    }
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
      try session.setActive(true)
      let input = engine.inputNode
      let format = input.outputFormat(forBus: 0)
      guard format.sampleRate > 0, format.channelCount > 0 else {
        throw APIError(status: 0, message: "No microphone input is available.")
      }
      input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
        guard let samples = buffer.floatChannelData?[0], buffer.frameLength > 0 else { return }
        let count = Int(buffer.frameLength)
        var sum = 0.0
        for index in 0..<count { sum += Double(samples[index] * samples[index]) }
        let rms = min(1, sqrt(sum / Double(count)) * 5)
        Task { @MainActor [weak self] in
          guard let self, self.active else { return }
          self.level += (rms - self.level) * (rms > self.level ? 0.45 : 0.08)
        }
      }
      tapped = true
      try engine.start()
      active = true
      error = nil
    } catch {
      stop()
      self.error = "Microphone unavailable. Try again or continue by typing."
    }
  }
  func stop() {
    generation += 1
    starting = false
    active = false
    engine.stop()
    if tapped {
      engine.inputNode.removeTap(onBus: 0)
      tapped = false
    }
    level = 0
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}

struct VoiceStudioView: View {
  var body: some View {
    VoiceStudioContent().environment(\.appPalette, .voice).tint(AppPalette.voice.primary)
  }
}

private struct VoiceStudioContent: View {
  @Environment(\.appPalette) private var palette
  @Environment(\.scenePhase) private var scenePhase
  @State private var microphone = MicrophoneMeter()
  @State private var speech = AVSpeechSynthesizer()
  @State private var active = false
  @State private var paused = false
  @State private var atmospherePaused = false
  @State private var preview = false
  @State private var pace = 1.0
  @State private var style = "calm"
  @State private var input = ""
  @State private var messages: [Message] = []
  private struct Message: Identifiable {
    let id = UUID()
    let text: String
    let mine: Bool
  }
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 22) {
        StatusBadge(text: "Local prototype", outlined: true)
        Text("A little space to think.").font(Theme.title(34))
        AuroraView(
          rate: 0.25 + microphone.level * 3.75,
          paused: atmospherePaused || paused || scenePhase != .active
        )
        .frame(height: 210).clipShape(RoundedRectangle(cornerRadius: 24))
        Text(
          "Scripted replies, not live AI. Audio levels stay on this device; nothing is recorded, transcribed, or uploaded."
        )
        .font(Theme.caption).foregroundStyle(palette.muted)
        AppSegmentedControl(
          title: "Voice style", selection: $style,
          options: [
            ("calm", "Calm"), ("bright", "Bright"), ("grounded", "Grounded"),
          ])
        LabeledContent("Pace", value: pace.formatted(.number.precision(.fractionLength(1))) + "×")
        AppSlider(value: $pace, bounds: 0.7...1.3, step: 0.1, label: "Voice preview pace")
        Toggle("Preview with a local device voice", isOn: $preview)
        if messages.isEmpty {
          ForEach(["Find a project", "Explore my skills", "Share an idea"], id: \.self) { prompt in
            Button(prompt) { begin(prompt) }.buttonStyle(AppButtonStyle())
          }
        }
        ForEach(messages) { message in
          VStack(alignment: .leading, spacing: 7) {
            Text(message.mine ? "You" : "Studio").font(Theme.metadata)
            Text(message.text)
          }.paperCard()
        }
        if active {
          TextField(
            "Type a thought", text: $input,
            prompt: Text("Type a thought").foregroundStyle(palette.muted), axis: .vertical)
          Button("Send thought") {
            begin(input)
            input = ""
          }.buttonStyle(AppButtonStyle.primary)
            .disabled(paused || input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
          HStack {
            Button(paused ? "Resume" : "Pause") {
              paused.toggle()
              if paused { stopAudio() }
            }.buttonStyle(AppButtonStyle())
            Button("End session") {
              active = false
              paused = false
              stopAudio()
            }.buttonStyle(AppButtonStyle())
          }
          Button(
            microphone.active ? "Turn microphone off" : "Enable microphone",
            systemImage: microphone.active ? "mic.slash" : "mic"
          ) {
            if microphone.active { microphone.stop() } else { Task { await microphone.start() } }
          }.disabled(paused)
          ProgressView(value: microphone.level).accessibilityLabel("Microphone sound level")
        }
        if let error = microphone.error { Text(error).foregroundStyle(Theme.error) }
        Button(atmospherePaused ? "Resume atmosphere" : "Pause atmosphere") {
          atmospherePaused.toggle()
        }
        Button("Clear conversation", role: .destructive) {
          messages = []
          active = false
          paused = false
          stopAudio()
        }
      }.padding(20)
    }.pageBackground().appNavigationTitle("Voice studio")
      .onDisappear { stopAudio() }
      .onChange(of: scenePhase) { _, phase in
        if phase != .active {
          paused = active
          stopAudio()
        }
      }
      .onChange(of: preview) { _, enabled in if !enabled { speech.stopSpeaking(at: .immediate) } }
      .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.interruptionNotification))
    { _ in
      paused = active
      stopAudio()
    }
  }
  private func begin(_ text: String) {
    let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else { return }
    active = true
    paused = false
    messages.append(Message(text: text, mine: true))
    let reply: String
    if text.localizedCaseInsensitiveContains("skill") {
      reply =
        "Think of something you have already built, then one skill you would like to practice. Add both to your developer profile to find a useful stretch."
    } else if text.localizedCaseInsensitiveContains("idea") {
      reply =
        "Start with the people it would help and the smallest useful result. You can turn that into a community request when you are ready."
    } else {
      reply =
        "Look for a project whose purpose interests you. Explore shows nearby work; your developer profile explains where you are ready and where you could grow."
    }
    messages.append(Message(text: reply, mine: false))
    if preview,
      let voice = AVSpeechSynthesisVoice.speechVoices().first(where: { $0.language.hasPrefix("en") }
      )
    {
      speech.stopSpeaking(at: .immediate)
      let utterance = AVSpeechUtterance(string: reply)
      utterance.voice = voice
      utterance.rate = AVSpeechUtteranceDefaultSpeechRate * Float(pace)
      utterance.pitchMultiplier = style == "bright" ? 1.1 : style == "grounded" ? 0.9 : 1
      speech.speak(utterance)
    }
  }
  private func stopAudio() {
    microphone.stop()
    speech.stopSpeaking(at: .immediate)
  }
}

private struct AuroraView: View {
  let rate: Double
  let paused: Bool
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var phase = 0.0
  @State private var previous: Date?
  var body: some View {
    TimelineView(.animation(minimumInterval: 1.0 / 30, paused: paused || reduceMotion)) { context in
      Canvas { graphics, size in
        graphics.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Theme.Voice.sand))
        for ribbon in 0..<4 {
          var path = Path()
          for step in 0...80 {
            let x = size.width * Double(step) / 80
            let y =
              size.height * (0.3 + Double(ribbon) * 0.13) + sin(x / 65 + phase + Double(ribbon))
              * 32
            if step == 0 {
              path.move(to: CGPoint(x: x, y: y))
            } else {
              path.addLine(to: CGPoint(x: x, y: y))
            }
          }
          graphics.stroke(
            path,
            with: .linearGradient(
              Gradient(colors: [
                Theme.Voice.moss.opacity(0.2),
                ribbon.isMultiple(of: 2) ? Theme.Voice.moss : Theme.Voice.rust,
                Theme.Voice.plum.opacity(0.25),
              ]), startPoint: .zero, endPoint: CGPoint(x: size.width, y: size.height)),
            style: StrokeStyle(lineWidth: 15, lineCap: .round))
        }
      }.onChange(of: context.date) { _, date in
        if let previous { phase += min(0.1, date.timeIntervalSince(previous)) * rate }
        previous = date
      }
    }.accessibilityHidden(true)
  }
}
