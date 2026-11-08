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
  static var style: MapStyle {
    .standard(
      theme: .custom, lightPreset: .day, showPointOfInterestLabels: false,
      showTransitLabels: false, showRoadLabels: false,
      colorBuildingHighlight: StyleColor(UIColor(Theme.accent)),
      colorBuildings: StyleColor(UIColor(Theme.mapBuildings)),
      colorCommercial: StyleColor(UIColor(Theme.mapBuildings)),
      colorEducation: StyleColor(UIColor(Theme.softAccent)),
      colorGreenspace: StyleColor(UIColor(Theme.mapGreenspace)),
      colorIndustrial: StyleColor(UIColor(Theme.mapBuildings)),
      colorLand: StyleColor(UIColor(Theme.mapLand)),
      colorMedical: StyleColor(UIColor(Theme.errorSurface)),
      colorMotorways: StyleColor(UIColor(Theme.mapHighways)),
      colorPlaceLabels: StyleColor(UIColor(Theme.mapText)),
      colorRoadLabels: StyleColor(UIColor(Theme.mapMuted)),
      colorRoads: StyleColor(UIColor(Theme.mapRoads)),
      colorTrunks: StyleColor(UIColor(Theme.mapHighways)),
      colorWater: StyleColor(UIColor(Theme.mapWater)),
      show3dTrees: false)
  }
  static var overview: Viewport {
    var viewport = Viewport.camera(center: center, zoom: 10, pitch: 0)
    viewport.padding = EdgeInsets(top: 90, leading: 24, bottom: 300, trailing: 24)
    return viewport
  }
  static func marker(_ listing: Listing, selected: Bool = false) -> PointAnnotation.Image {
    let category = listing.category
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: 42, height: 48))
    let image = renderer.image { _ in
      UIColor(category == .paid ? Theme.highlight : Theme.accent).setFill()
      UIBezierPath(roundedRect: CGRect(x: 2, y: 1, width: 38, height: 38), cornerRadius: 11).fill()
      if selected {
        UIColor(Theme.mapText).setStroke()
        let outline = UIBezierPath(
          roundedRect: CGRect(x: 4, y: 3, width: 34, height: 34), cornerRadius: 9)
        outline.lineWidth = 3
        outline.stroke()
      }
      let path = UIBezierPath()
      path.move(to: CGPoint(x: 15, y: 36))
      path.addLine(to: CGPoint(x: 21, y: 47))
      path.addLine(to: CGPoint(x: 27, y: 36))
      path.close()
      path.fill()
      let configuration = UIImage.SymbolConfiguration(pointSize: 18, weight: .semibold)
      UIImage(systemName: category.symbol, withConfiguration: configuration)?
        .withTintColor(
          UIColor(Theme.ink), renderingMode: .alwaysOriginal
        )
        .draw(in: CGRect(x: 12, y: 10, width: 18, height: 20))
    }
    return PointAnnotation.Image(image: image, name: "listing-\(category.rawValue)-\(selected)")
  }
}

struct ExploreView: View {
  private enum MapAction {
    case signIn(Route?)
    case post
  }
  var focus: String?
  @Environment(APIClient.self) private var api
  @Environment(AppModel.self) private var app
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @State private var feed = Resource<MapFeed>()
  @State private var query = ""
  @State private var filter = "all"
  @State private var selected: Listing?
  @State private var showingSheet = false
  @State private var sheetPath: [Route] = []
  @State private var pendingAction: MapAction?
  @State private var viewport: Viewport = MapConfiguration.overview
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
  @State private var trayHeight: CGFloat = 280

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
      map.ignoresSafeArea()
      VStack(spacing: 16) {
        HStack(alignment: .top, spacing: 12) {
          HStack(spacing: 10) {
            if !dynamicTypeSize.isAccessibilitySize { BrandLockup(compact: true) }
            Text("Calgary").font(Theme.title(24)).lineLimit(1).minimumScaleFactor(0.65)
          }.padding(.horizontal, 14).padding(.vertical, 10).controlSurface()
          Spacer(minLength: 0)
          Button {
            selected = nil
            move(to: MapConfiguration.overview)
          } label: {
            Image(systemName: "arrow.up.left.and.arrow.down.right").font(
              .system(size: 20, weight: .medium)
            ).frame(width: 54, height: 54)
          }.buttonStyle(AppButtonStyle(size: .icon)).accessibilityLabel("All Calgary")
            .accessibilityValue(
              is3D ? "3D view" : "City overview")
          if app.role == .requester || app.role == .company {
            Button {
              present(.post)
            } label: {
              Image(systemName: "plus").font(.system(size: 20, weight: .medium)).frame(
                width: 54, height: 54)
            }.buttonStyle(AppButtonStyle(size: .icon)).accessibilityLabel("Post").accessibilityHint(
              "Add an idea to the city map")
          } else if !app.signedIn {
            Button {
              present(.signIn(nil))
            } label: {
              Image(systemName: "person.crop.circle").font(.system(size: 20, weight: .medium))
                .frame(width: 54, height: 54)
            }.buttonStyle(AppButtonStyle(size: .icon)).accessibilityLabel("Sign in")
          }
        }
        Spacer()
        if let error = feed.error { FailureView(error: error) { await load() }.paperCard() }
        if feed.value?.truncated == true {
          Text("Some ideas are omitted from this feed.").font(.footnote).paperCard()
        }
        if let focus, focused && !(feed.value?.listings.contains { $0.id == focus } ?? false) {
          Text("This posting is closed, unavailable, or not on the Calgary map.").font(.footnote)
            .paperCard()
        }
        VStack(alignment: .leading, spacing: 16) {
          HStack {
            Text("Explore").font(
              Theme.title(29))
            Spacer()
            Button {
              openResults()
            } label: {
              Image(systemName: "chevron.up").font(.system(size: 18, weight: .medium)).frame(
                width: 44, height: 44)
            }.buttonStyle(AppButtonStyle(variant: .ghost, size: .icon))
              .accessibilityLabel("Show city ideas")
          }
          Button {
            openResults()
          } label: {
            HStack(spacing: 10) {
              Image(systemName: "magnifyingglass").font(.system(size: 18))
              Text(
                query.isEmpty
                  ? "Search ideas" : query
              ).lineLimit(1).minimumScaleFactor(0.8)
              Spacer(minLength: 0)
            }.font(Theme.body(17)).foregroundStyle(Theme.mapMuted)
              .padding(.horizontal, 16).frame(minHeight: 52)
              .background(Theme.canvas, in: RoundedRectangle(cornerRadius: 12))
              .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.inputBorder))
          }.buttonStyle(.plain).accessibilityLabel("Search city ideas")
          categoryFilters
          Button {
            openResults()
          } label: {
            HStack {
              if feed.loading { ProgressView().controlSize(.small) }
              Text(
                feed.loading && feed.value == nil
                  ? "Finding city ideas…"
                  : "\(listings.count) \(listings.count == 1 ? "idea" : "ideas")")
              Spacer()
              Image(systemName: "arrow.right").font(.system(size: 18, weight: .semibold))
            }.font(Theme.body(16)).frame(minHeight: 44)
          }.buttonStyle(AppButtonStyle(variant: .ghost, fullWidth: true))
            .accessibilityIdentifier("explore.results")
        }.padding(20).controlSurface(cornerRadius: 20)
          .onGeometryChange(for: CGFloat.self) { geometry in
            geometry.size.height
          } action: {
            trayHeight = $0
          }
      }.padding(.horizontal, 16).padding(.top, 8).padding(.bottom, 12)
      if cloudVisible && !MapConfiguration.token.isEmpty && !reduceMotion {
        VStack(spacing: 14) {
          Image("HeroCloud2").resizable().scaledToFit().frame(width: 220).accessibilityHidden(true)
          Text("Calgary.").font(Theme.title(40))
          Button("Skip animation") { cloudVisible = false }
        }.foregroundStyle(Theme.mapText).tint(Theme.accent)
          .frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.mapLand)
          .transition(.opacity).accessibilityElement(children: .contain)
      }
    }.pageBackground().navigationTitle("Explore").toolbar(.hidden, for: .navigationBar)
      .toolbarColorScheme(.light, for: .tabBar)
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
          if let action = pendingAction {
            pendingAction = nil
            present(action)
          }
        }
      ) {
        AppNavigation(path: $sheetPath) {
          ScrollView {
            VStack(alignment: .leading, spacing: 18) {
              if let selected {
                ListingPreview(listing: selected)
                Button("Back to results") { self.selected = nil }
              } else {
                HStack(spacing: 10) {
                  Image(systemName: "magnifyingglass").font(.system(size: 18)).accessibilityHidden(
                    true)
                  TextField(
                    "Search city ideas", text: $query,
                    prompt: Text("Search ideas, skills, places").foregroundStyle(Theme.muted)
                  ).textFieldStyle(.plain).submitLabel(.search)
                    .accessibilityLabel("Search city ideas").accessibilityIdentifier(
                      "explore.search")
                  if !query.isEmpty {
                    Button {
                      query = ""
                    } label: {
                      Image(systemName: "xmark.circle.fill").frame(width: 44, height: 44)
                    }
                    .accessibilityLabel("Clear search")
                  }
                }.padding(.horizontal, 12).frame(minHeight: 44)
                  .background(Theme.card, in: RoundedRectangle(cornerRadius: 12))
                  .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.inputBorder))
                categoryFilters
                Text("\(listings.count) \(listings.count == 1 ? "idea" : "ideas")").font(
                  Theme.metadata
                )
                .foregroundStyle(Theme.muted).accessibilityAddTraits(.updatesFrequently)
                if feed.loading { ProgressView() }
                if listings.isEmpty {
                  EmptyState(
                    title: query.isEmpty && filter == "all"
                      ? "No city ideas yet" : "No matching ideas", symbol: "lightbulb")
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
                    IdeaRowContent(
                      title: listing.title, detail: listing.neighbourhood,
                      category: listing.category,
                      subtitle: listing.summaryMetadata
                    ).paperCard()
                  }.buttonStyle(.plain)
                }
                Button("Refresh ideas") { Task { await load() } }.disabled(feed.loading)
              }
            }.padding(20)
          }.safeAreaInset(edge: .bottom) {
            if let selected {
              ListingAction(listing: selected) { route in
                present(.signIn(route))
              }.padding(.horizontal, 20).padding(.vertical, 12).background(Theme.canvas)
            }
          }.pageBackground().appNavigationTitle(selected == nil ? "Ideas for Calgary" : "City idea")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
              AppToolbarItem(placement: .topBarTrailing) { Button("Done") { showingSheet = false } }
            }
        }.presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
          .presentationBackground(Theme.canvas).presentationCornerRadius(20)
          .presentationBackgroundInteraction(.enabled(upThrough: .medium))
          .preferredColorScheme(.light)
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
        .preferredColorScheme(.light)
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
            AppToolbarItem(placement: .cancellationAction) { Button("Done") { postPin = nil } }
          }
        }.preferredColorScheme(.light)
      }
  }

  private var categoryFilters: some View {
    AppSegmentedControl(
      title: "Idea category", selection: $filter,
      options: [
        ("all", "All"), ("request", "Community"), ("volunteer", "Volunteer"), ("paid", "Paid"),
      ]
    )
    .accessibilityIdentifier("explore.category")
  }
  private func openResults() {
    selected = nil
    sheetPath = []
    showingSheet = true
  }
  private func present(_ action: MapAction) {
    if showingSheet {
      pendingAction = action
      showingSheet = false
      return
    }
    switch action {
    case .signIn(let route): app.authenticate(for: route)
    case .post: choosingPin = true
    }
  }

  @ViewBuilder private var map: some View {
    if MapConfiguration.token.isEmpty || mapFailed {
      VStack(spacing: 18) {
        HeroLandscape(compact: true).frame(height: 160).clipShape(
          RoundedRectangle(cornerRadius: 28))
        Text("The city is full of possibilities.").font(Theme.title(28)).multilineTextAlignment(
          .center)
        Text(
          MapConfiguration.token.isEmpty
            ? "The live map is not configured. Project lists remain available."
            : "The map could not load. Project lists remain available."
        )
        .foregroundStyle(Theme.mapMuted).multilineTextAlignment(.center)
        if mapFailed {
          Button("Retry map") {
            mapFailed = false
            mapGeneration += 1
          }
        }
      }.padding(28).padding(.bottom, 230).frame(maxWidth: .infinity, maxHeight: .infinity)
        .foregroundStyle(Theme.mapText).background(Theme.mapLand)
    } else {
      MapboxMaps.Map(viewport: $viewport) {
        PointAnnotationGroup(listings, id: \.id) { listing in
          PointAnnotation(
            coordinate: .init(latitude: listing.latitude, longitude: listing.longitude)
          )
          .image(MapConfiguration.marker(listing, selected: selected?.id == listing.id)).iconAnchor(
            .bottom
          )
          .onTapGesture { select(listing) }
        }.clusterOptions(
          ClusterOptions(
            circleColor: .constant(StyleColor(UIColor(Theme.accent))),
            textColor: .constant(StyleColor(UIColor(Theme.ink))))
        )
        .onClusterTapGesture { context in
          move(
            to: .camera(center: context.coordinate, zoom: context.expansionZoom ?? 14))
        }
      }.mapStyle(MapConfiguration.style)
        .ornamentOptions(
          OrnamentOptions(
            scaleBar: .init(visibility: .hidden),
            compass: .init(position: .topTrailing, margins: CGPoint(x: 16, y: 82)),
            logo: .init(position: .bottomLeading, margins: CGPoint(x: 20, y: trayHeight + 24)),
            attributionButton: .init(
              position: .bottomTrailing, margins: CGPoint(x: 20, y: trayHeight + 24)))
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
  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      IdeaArtwork(category: listing.category)
      StatusBadge(
        text: listing.source == "request" ? "Community · \(listing.status)" : listing.kind)
      Text(listing.title).font(Theme.title(30))
      Text(listing.organization).foregroundStyle(Theme.muted)
      Label(listing.neighbourhood, systemImage: "mappin").font(Theme.metadata)
      if !listing.precise {
        Text("Approximate area. Developer accounts can see the exact place.").font(.footnote)
      }
      Text(listing.description)
      LabeledContent("Commitment", value: listing.commitment)
      LabeledContent("Compensation", value: listing.compensation)
      Text(listing.skills.joined(separator: " / ")).font(Theme.metadata)
    }
  }
}

private struct ListingAction: View {
  let listing: Listing
  let authenticate: (Route) -> Void
  @Environment(AppModel.self) private var app
  private var route: Route {
    listing.source == "request" ? .request(listing.id) : .opportunity(listing.id)
  }
  var body: some View {
    Group {
      if !app.signedIn {
        Button("Sign in to respond") { authenticate(route) }.buttonStyle(AppButtonStyle.primary)
      } else if listing.source == "opportunity" || listing.viewerIsOwner || app.role == .developer {
        NavigationLink(
          listing.viewerIsOwner
            ? "Manage posting" : app.role == .developer ? "Review and respond" : "View details",
          value: route
        )
        .buttonStyle(AppButtonStyle.primary)
      } else {
        Text("Developer accounts can pick up community ideas.").font(.footnote).foregroundStyle(
          Theme.muted)
      }
    }
  }
}

extension Listing {
  var category: IdeaCategory {
    source == "request" ? .community : kind == "paid" ? .paid : .volunteer
  }
  var summaryMetadata: String {
    category.title.localizedCaseInsensitiveCompare(compensation) == .orderedSame
      ? category.title : "\(category.title) · \(compensation)"
  }
}
