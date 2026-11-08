import CoreLocation
import MapboxMaps
import SwiftUI

struct Pin: Identifiable, Equatable {
  var latitude: Double
  var longitude: Double
  var place = "Calgary"
  var id: String { "\(latitude),\(longitude)" }
  var coordinate: CLLocationCoordinate2D { .init(latitude: latitude, longitude: longitude) }
}

enum MapConfiguration {
  static let center = CLLocationCoordinate2D(latitude: 51.0447, longitude: -114.0719)
  static var token: String {
    Bundle.main.object(forInfoDictionaryKey: "MBXAccessToken") as? String ?? ""
  }
  static func configure() {
    if !token.isEmpty { MapboxOptions.accessToken = token }
  }
  static func marker(_ listing: Listing) -> PointAnnotation.Image {
    let symbol = listing.source == "request" ? "R" : listing.kind == "paid" ? "P" : "V"
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: 42, height: 48))
    let image = renderer.image { _ in
      UIColor(Theme.pine).setFill()
      UIBezierPath(roundedRect: CGRect(x: 2, y: 1, width: 38, height: 38), cornerRadius: 11).fill()
      let path = UIBezierPath()
      path.move(to: CGPoint(x: 15, y: 36))
      path.addLine(to: CGPoint(x: 21, y: 47))
      path.addLine(to: CGPoint(x: 27, y: 36))
      path.close()
      path.fill()
      (symbol as NSString).draw(
        at: CGPoint(x: 14, y: 10),
        withAttributes: [
          .font: UIFont.systemFont(ofSize: 18, weight: .bold),
          .foregroundColor: UIColor(Theme.canvas),
        ])
    }
    return PointAnnotation.Image(image: image, name: "listing-\(symbol)")
  }
}

struct ExploreView: View {
  var focus: String?
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var feed = Resource<MapFeed>()
  @State private var query = ""
  @State private var filter = "all"
  @State private var selected: Listing?
  @State private var showingSheet = false
  @State private var sheetPath: [Route] = []
  @State private var deferredAuth: Route?
  @State private var viewport: Viewport = .camera(center: MapConfiguration.center, zoom: 10)
  @State private var mapReady = false
  @State private var is3D = false
  @State private var mapSettled = false
  @State private var mapFailed = false
  @State private var mapGeneration = 0
  @State private var choosingPin = false
  @State private var postPin: Pin?
  @State private var pendingPostPin: Pin?
  @State private var postPath: [Route] = []
  @State private var focused = false
  @State private var cloudVisible = true

  private var listings: [Listing] {
    (feed.value?.listings ?? []).filter { item in
      let matchesType =
        filter == "all"
        || (filter == "request"
          ? item.source == "request" : item.source == "opportunity" && item.kind == filter)
      let text = [
        item.title, item.description, item.organization, item.neighbourhood,
        item.skills.joined(separator: " "),
      ].joined(separator: " ")
      return matchesType && (query.isEmpty || text.localizedCaseInsensitiveContains(query))
    }
  }

  var body: some View {
    ZStack(alignment: .top) {
      map
      VStack(spacing: 12) {
        HStack {
          Image(systemName: "magnifyingglass").accessibilityHidden(true)
          TextField(
            "Search Calgary projects", text: $query,
            prompt: Text("Search Calgary projects").foregroundStyle(Theme.muted)
          ).submitLabel(.search)
            .accessibilityIdentifier("explore.search")
          if !query.isEmpty {
            Button("Clear", systemImage: "xmark.circle.fill") { query = "" }.labelStyle(.iconOnly)
          }
        }.padding(16).mapControlSurface()
        HStack(spacing: 12) {
          Menu {
            Picker("Project type", selection: $filter) {
              Text("All projects").tag("all")
              Text("Paid").tag("paid")
              Text("Volunteer").tag("volunteer")
              Text("Community").tag("request")
            }
          } label: {
            Label(
              filter == "all" ? "All projects" : filter.capitalized,
              systemImage: "line.3.horizontal.decrease")
          }
          Spacer()
          Button("All Calgary", systemImage: "arrow.up.left.and.arrow.down.right") {
            selected = nil
            move(to: .camera(center: MapConfiguration.center, zoom: 10, pitch: 0))
          }
        }.padding(14).mapControlSurface()
        Spacer()
        if let error = feed.error { FailureView(error: error) { await load() }.paperCard() }
        if feed.value?.truncated == true {
          Text("Some projects are omitted from this feed.").font(.footnote).paperCard()
        }
        if let focus, focused && !(feed.value?.listings.contains { $0.id == focus } ?? false) {
          Text("This posting is closed, unavailable, or not on the Calgary map.").font(.footnote)
            .paperCard()
        }
        HStack {
          Button {
            selected = nil
            sheetPath = []
            showingSheet = true
          } label: {
            Label("\(listings.count) projects", systemImage: "list.bullet").frame(minHeight: 48)
          }.accessibilityIdentifier("explore.results")
          Spacer()
          if app.role == .requester || app.role == .company {
            Button("Post", systemImage: "plus") { choosingPin = true }.frame(minHeight: 48)
          }
        }.padding(.horizontal, 18).mapControlSurface()
      }.padding(16).padding(.bottom, 40)
      if mapReady && !mapFailed {
        VStack {
          Spacer()
          HStack {
            Text(is3D ? (mapSettled ? "3D view" : "Flying to project") : "City overview").font(
              Theme.metadata
            ).padding(8)
              .background(Theme.card, in: RoundedRectangle(cornerRadius: 8))
            Spacer()
          }
        }.padding(.leading, 16).padding(.bottom, 105).allowsHitTesting(false)
      }
      if cloudVisible && !MapConfiguration.token.isEmpty && !reduceMotion {
        VStack(spacing: 14) {
          Image(systemName: "cloud.fill").font(.system(size: 100)).foregroundStyle(Theme.canvas)
          Text("Calgary.").font(Theme.title(40))
          Button("Skip animation") { cloudVisible = false }
        }.frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.mint)
          .transition(.opacity).accessibilityElement(children: .contain)
      }
    }.pageBackground().navigationTitle("Explore").navigationBarTitleDisplayMode(.inline)
      .task(id: app.revision) { await load() }
      .task {
        MapConfiguration.configure()
        if reduceMotion || MapConfiguration.token.isEmpty {
          cloudVisible = false
        } else {
          do { try await Task.sleep(for: .seconds(6)) } catch { return }
          cloudVisible = false
        }
      }
      .onChange(of: mapReady) { _, ready in
        if ready {
          withAnimation(reduceMotion ? nil : .easeOut(duration: 0.5)) { cloudVisible = false }
        }
      }
      .onChange(of: query) { _, _ in selected = nil }
      .onChange(of: filter) { _, _ in selected = nil }
      .sheet(
        isPresented: $showingSheet,
        onDismiss: {
          if let route = deferredAuth {
            deferredAuth = nil
            app.authenticate(for: route)
          }
        }
      ) {
        AppNavigation(path: $sheetPath) {
          ScrollView {
            VStack(alignment: .leading, spacing: 18) {
              if let selected {
                ListingPreview(listing: selected) { route in
                  deferredAuth = route
                  showingSheet = false
                }
                Button("Back to results") { self.selected = nil }
              } else {
                Text("Calgary projects").font(Theme.title(28))
                if feed.loading { ProgressView() }
                if listings.isEmpty {
                  EmptyState(
                    title: query.isEmpty && filter == "all"
                      ? "Nothing posted yet" : "No matching projects", symbol: "map")
                  if !query.isEmpty || filter != "all" {
                    Button("Clear filters") {
                      query = ""
                      filter = "all"
                    }
                  }
                }
                ForEach(listings) { listing in
                  Button {
                    select(listing)
                  } label: {
                    VStack(alignment: .leading, spacing: 10) {
                      Text(listing.title).font(Theme.title(23))
                      Text(listing.neighbourhood).font(Theme.metadata)
                      Text(listing.compensation).foregroundStyle(Theme.muted)
                    }.paperCard()
                  }.buttonStyle(.plain)
                }
                Button("Refresh projects") { Task { await load() } }.disabled(feed.loading)
              }
            }.padding(20)
          }.pageBackground().navigationBarTitleDisplayMode(.inline)
            .toolbar {
              ToolbarItem(placement: .topBarTrailing) { Button("Done") { showingSheet = false } }
            }
        }.presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
      }
      .sheet(
        isPresented: $choosingPin,
        onDismiss: {
          if let pendingPostPin {
            postPath = []
            postPin = pendingPostPin
            self.pendingPostPin = nil
          }
        }
      ) {
        PinPicker(
          latitude: MapConfiguration.center.latitude, longitude: MapConfiguration.center.longitude
        ) { pendingPostPin = $0 }
      }
      .sheet(item: $postPin) { pin in
        AppNavigation(path: $postPath) {
          Group {
            if app.role == .requester {
              RequestEditorView(initialPin: pin)
            } else {
              OpportunityEditorView(initialPin: pin)
            }
          }.toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Done") { postPin = nil } }
          }
        }
      }
  }

  @ViewBuilder private var map: some View {
    if MapConfiguration.token.isEmpty || mapFailed {
      VStack(spacing: 18) {
        GardenScene().frame(maxWidth: 400)
        Text("Good work. Close to home.").font(Theme.title(28)).multilineTextAlignment(.center)
        Text(
          MapConfiguration.token.isEmpty
            ? "The live map is not configured. Project lists remain available."
            : "The map could not load. Project lists remain available."
        )
        .foregroundStyle(Theme.muted).multilineTextAlignment(.center)
        if mapFailed {
          Button("Retry map") {
            mapFailed = false
            mapGeneration += 1
          }
        }
      }.padding(28).frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.canvas)
    } else {
      MapboxMaps.Map(viewport: $viewport) {
        PointAnnotationGroup(listings, id: \.id) { listing in
          PointAnnotation(
            coordinate: .init(latitude: listing.latitude, longitude: listing.longitude)
          )
          .image(MapConfiguration.marker(listing)).iconAnchor(.bottom)
          .onTapGesture { select(listing) }
        }.clusterOptions(
          ClusterOptions(
            circleColor: .constant(StyleColor(UIColor(Theme.pine))),
            textColor: .constant(StyleColor(UIColor(Theme.canvas))))
        )
        .onClusterTapGesture { context in
          move(
            to: .camera(center: context.coordinate, zoom: context.expansionZoom ?? 14))
        }
      }.mapStyle(.standard(lightPreset: .day))
        .ornamentOptions(
          OrnamentOptions(
            scaleBar: .init(visibility: .hidden),
            compass: .init(position: .bottomTrailing, margins: CGPoint(x: 16, y: 150)))
        )
        .onMapLoaded { _ in mapReady = true }
        .onMapIdle { _ in mapSettled = true }
        .onCameraChanged { context in
          if mapSettled { mapSettled = false }
          let pitched = context.cameraState.pitch >= 30
          if is3D != pitched { is3D = pitched }
        }
        .onMapLoadingError { _ in
          mapFailed = true
          cloudVisible = false
        }
        .id(mapGeneration)
        .onAppear { MapConfiguration.configure() }
    }
  }
  private func move(to target: Viewport) {
    if reduceMotion {
      viewport = target
    } else {
      withViewportAnimation(.fly(duration: 1.1)) { viewport = target }
    }
  }
  private func select(_ listing: Listing) {
    selected = listing
    sheetPath = []
    var target = Viewport.camera(
      center: .init(latitude: listing.latitude, longitude: listing.longitude),
      zoom: listing.precise ? 15.8 : 13, bearing: -20, pitch: reduceMotion ? 0 : 55)
    target.padding = EdgeInsets(top: 100, leading: 20, bottom: 260, trailing: 20)
    move(to: target)
    showingSheet = true
  }
  private func load() async {
    await feed.load(api, "/map")
    if let selected { self.selected = feed.value?.listings.first { $0.id == selected.id } }
    if !focused, let focus, feed.value != nil {
      focused = true
      if let listing = feed.value?.listings.first(where: { $0.id == focus }) { select(listing) }
    }
  }
}

struct ListingPreview: View {
  let listing: Listing
  let authenticate: (Route) -> Void
  @Environment(AppModel.self) private var app
  private var route: Route {
    listing.source == "request" ? .request(listing.id) : .opportunity(listing.id)
  }
  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      StatusBadge(
        text: listing.source == "request" ? "Community · \(listing.status)" : listing.kind)
      Text(listing.title).font(Theme.title(30))
      Text(listing.organization).foregroundStyle(Theme.muted)
      Label(listing.neighbourhood, systemImage: "mappin").font(Theme.metadata)
      if !listing.precise {
        Text("Approximate area. Developer accounts can see the exact place.").font(.footnote)
      }
      Text(listing.description)
      Text(listing.skills.joined(separator: " / ")).font(Theme.metadata)
      if !app.signedIn {
        Button("Sign in to respond") { authenticate(route) }.buttonStyle(RaisedButtonStyle())
      } else if listing.source == "opportunity" || listing.viewerIsOwner || app.role == .developer {
        NavigationLink(
          listing.viewerIsOwner
            ? "Manage posting" : app.role == .developer ? "Review and respond" : "View details",
          value: route
        )
        .buttonStyle(RaisedButtonStyle())
      } else {
        Text("Developer accounts can accept community requests.").font(.footnote).foregroundStyle(
          Theme.muted)
      }
    }
  }
}
