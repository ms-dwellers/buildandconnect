import CoreLocation
import MapboxMaps
import SwiftUI

@MainActor @Observable
final class LocationPicker: NSObject, @preconcurrency CLLocationManagerDelegate {
  private let manager = CLLocationManager()
  private var requested = false
  var fixRevision = 0
  var coordinate: CLLocationCoordinate2D?
  var message: String?
  override init() {
    super.init()
    manager.delegate = self
  }
  func request() {
    requested = true
    switch manager.authorizationStatus {
    case .notDetermined: manager.requestWhenInUseAuthorization()
    case .authorizedAlways, .authorizedWhenInUse: manager.requestLocation()
    default:
      requested = false
      message = "Location access is off. Choose a pin manually, or enable access in Settings."
    }
  }
  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    guard requested else { return }
    if manager.authorizationStatus == .authorizedWhenInUse
      || manager.authorizationStatus == .authorizedAlways
    {
      manager.requestLocation()
    }
  }
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard requested else { return }
    requested = false
    coordinate = locations.last?.coordinate
    fixRevision += 1
    message = nil
  }
  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    guard requested else { return }
    requested = false
    message = "Your location could not be found. You can choose a pin manually."
  }
  func cancel() {
    requested = false
    manager.stopUpdatingLocation()
  }
}

struct PinPicker: View {
  let latitude: Double
  let longitude: Double
  var radiusKm: Double?
  let onSelect: (Pin) -> Void
  @Environment(\.dismiss) private var dismiss
  @State private var pin = Pin(latitude: 51.0447, longitude: -114.0719)
  @State private var viewport: Viewport = .camera(center: MapConfiguration.center, zoom: 11)
  @State private var location = LocationPicker()
  @State private var failed = false
  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        if !MapConfiguration.token.isEmpty && !failed {
          MapboxMaps.Map(viewport: $viewport) {
            TapInteraction { context in
              pin.latitude = context.coordinate.latitude
              pin.longitude = context.coordinate.longitude
              return true
            }
            MapViewAnnotation(coordinate: pin.coordinate) {
              Image(systemName: "mappin.circle.fill").font(.system(size: 42)).foregroundStyle(
                Theme.accentStrong
              )
              .background(Theme.card, in: Circle()).accessibilityLabel("Selected pin")
            }
            if let radiusKm {
              PolygonAnnotation(
                polygon: Polygon(center: pin.coordinate, radius: radiusKm * 1000, vertices: 64)
              )
              .fillColor(StyleColor(UIColor(Theme.accent))).fillOpacity(0.16)
              .fillOutlineColor(StyleColor(UIColor(Theme.accent)))
            }
          }.mapStyle(MapConfiguration.style)
            .onMapLoadingError { _ in failed = true }
            .frame(minHeight: 220)
            .accessibilityHint("Tap the map to place a pin, or enter coordinates below")
        } else {
          Text("Map unavailable. Enter coordinates or use downtown Calgary.").padding(20)
        }
        Form {
          Section {
            Button("Use my location", systemImage: "location") { location.request() }
            Button("Use downtown Calgary") {
              pin = Pin(latitude: 51.0447, longitude: -114.0719)
              viewport = .camera(center: pin.coordinate, zoom: 12)
            }
            if let message = location.message {
              Text(message).font(Theme.caption).foregroundStyle(Theme.muted)
            }
          }
          AppSection("Selected location") {
            AppField(title: "Latitude") {
              TextField(
                "Latitude", value: $pin.latitude, format: .number.precision(.fractionLength(6))
              )
              .keyboardType(.numbersAndPunctuation)
            }
            AppField(title: "Longitude") {
              TextField(
                "Longitude", value: $pin.longitude, format: .number.precision(.fractionLength(6))
              )
              .keyboardType(.numbersAndPunctuation)
            }
            AppField(title: "Place name") {
              TextField(
                "Place name", text: $pin.place,
                prompt: Text("Place name").foregroundStyle(Theme.muted))
            }
          }
          Section {
            Button("Use this pin") {
              onSelect(pin)
              dismiss()
            }.buttonStyle(AppButtonStyle.primary)
              .listRowBackground(Color.clear)
              .disabled(
                !pin.latitude.isFinite || !pin.longitude.isFinite
                  || !(-90...90).contains(pin.latitude) || !(-180...180).contains(pin.longitude)
              )
              .accessibilityIdentifier("pin.confirm")
          }
        }.pageBackground()
      }.pageBackground().appNavigationTitle("Choose a location")
        .presentationBackground(Theme.canvas)
        .toolbar {
          AppToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
        }
        .onAppear {
          MapConfiguration.configure()
          pin = Pin(latitude: latitude, longitude: longitude)
          viewport = .camera(center: pin.coordinate, zoom: 11)
        }
        .onDisappear { location.cancel() }
        .onChange(of: location.fixRevision) { _, _ in
          if let coordinate = location.coordinate {
            pin.latitude = coordinate.latitude
            pin.longitude = coordinate.longitude
            viewport = .camera(center: coordinate, zoom: 13)
          }
        }
    }
  }
}
