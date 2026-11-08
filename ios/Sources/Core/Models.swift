import Foundation

enum Role: String, Codable, CaseIterable, Identifiable {
  case developer, requester
  var id: String { rawValue }
  var title: String { rawValue.capitalized }
  var symbol: String {
    switch self {
    case .developer: "chevron.left.forwardslash.chevron.right"
    case .requester: "hands.sparkles"
    }
  }
  var purpose: String {
    switch self {
    case .developer: "Build skills through projects that matter."
    case .requester: "Find help with a community project."
    }
  }
}

struct Member: Codable, Equatable {
  struct User: Codable, Equatable {
    let id: String
    let name: String
  }
  let user: User
  let role: Role?
}

struct Page<Item: Decodable>: Decodable {
  let data: [Item]
  let nextCursor: String?
}

struct Ranked<Item: Decodable>: Decodable {
  let data: [Item]
  let total: Int
}
struct Created: Decodable { let id: String }
struct EmptyResponse: Decodable {}

struct Area: Codable, Equatable {
  var latitude = 51.0447
  var longitude = -114.0719
  var radiusKm = 25.0
}

struct Skill: Codable, Identifiable, Equatable {
  var name = ""
  var level = 2
  var id: String { name }
}

struct Project: Codable, Equatable {
  var title = ""
  var description = ""
  var technologies: [String] = []
}

struct ProfileInput: Codable, Equatable {
  var bio = ""
  var city = "Calgary"
  var skills: [Skill] = []
  var projects: [Project] = []
  var interests: [String] = []
  var wantsToLearn: [String] = []
  var experienceLevel = 1
  var collaboration = "flexible"
  var weeklyHours = 8
  var acceptsVolunteer = false
  var available = true
  var discoverable = false
  var professionalExperienceYears: Double?
  var compensationPreference: CompensationPreference?
  var workArrangementPreference: WorkArrangementPreference?
  enum CodingKeys: String, CodingKey {
    case bio, city, skills, projects, interests, wantsToLearn, experienceLevel, collaboration
    case weeklyHours, acceptsVolunteer, available, discoverable
    case professionalExperienceYears, compensationPreference, workArrangementPreference
  }
  func encode(to encoder: Encoder) throws {
    var values = encoder.container(keyedBy: CodingKeys.self)
    try values.encode(bio, forKey: .bio)
    try values.encode(city, forKey: .city)
    try values.encode(skills, forKey: .skills)
    try values.encode(projects, forKey: .projects)
    try values.encode(interests, forKey: .interests)
    try values.encode(wantsToLearn, forKey: .wantsToLearn)
    try values.encode(experienceLevel, forKey: .experienceLevel)
    try values.encode(collaboration, forKey: .collaboration)
    try values.encode(weeklyHours, forKey: .weeklyHours)
    try values.encode(acceptsVolunteer, forKey: .acceptsVolunteer)
    try values.encode(available, forKey: .available)
    try values.encode(discoverable, forKey: .discoverable)
    // Explicit null clears an old preference; omitting it means preserve on the server.
    try values.encode(professionalExperienceYears, forKey: .professionalExperienceYears)
    try values.encode(compensationPreference, forKey: .compensationPreference)
    try values.encode(workArrangementPreference, forKey: .workArrangementPreference)
  }
  func differsOnlyInVisibility(from other: ProfileInput) -> Bool {
    var comparable = self
    comparable.available = other.available
    comparable.discoverable = other.discoverable
    return comparable == other
  }
}

struct CompensationPreference: Codable, Equatable {
  var currency = "CAD"
  var minimumHourlyRate: Double?
  var preferredHourlyRate: Double?
  enum CodingKeys: String, CodingKey { case currency, minimumHourlyRate, preferredHourlyRate }
  func encode(to encoder: Encoder) throws {
    var values = encoder.container(keyedBy: CodingKeys.self)
    try values.encode(currency, forKey: .currency)
    try values.encode(minimumHourlyRate, forKey: .minimumHourlyRate)
    try values.encode(preferredHourlyRate, forKey: .preferredHourlyRate)
  }
}

struct WorkArrangementPreference: Codable, Equatable {
  var preferred = "flexible"
  var required = false
}

struct Developer: Decodable, Identifiable {
  let revision: Int?
  let id: String
  let name: String
  let bio: String
  let city: String
  let skills: [Skill]
  let projects: [Project]
  let interests: [String]
  let wantsToLearn: [String]
  let experienceLevel: Int
  let collaboration: String
  let weeklyHours: Int
  let acceptsVolunteer: Bool
  let available: Bool
  let discoverable: Bool
  let location: Area?
  let professionalExperienceYears: Double?
  let compensationPreference: CompensationPreference?
  let workArrangementPreference: WorkArrangementPreference?

  var input: ProfileInput {
    ProfileInput(
      bio: bio, city: city, skills: skills, projects: projects,
      interests: interests, wantsToLearn: wantsToLearn,
      experienceLevel: experienceLevel, collaboration: collaboration,
      weeklyHours: weeklyHours, acceptsVolunteer: acceptsVolunteer,
      available: available, discoverable: discoverable,
      professionalExperienceYears: professionalExperienceYears,
      compensationPreference: compensationPreference,
      workArrangementPreference: workArrangementPreference)
  }
}

struct Analysis: Decodable {
  let requiredTechnologies: [String]
  let preferredTechnologies: [String]
  let difficulty: Int
  let experienceLevel: String
  let requiredSkills: [String]
  let responsibilities: [String]
  let learningOpportunities: [String]
  let mentorshipAvailable: Bool
  let activities: [ProjectActivity]?
}

struct ProjectActivity: Codable, Identifiable {
  let id: String
  let description: String
  let skills: [String]
}

struct CareerRequirement: Codable, Identifiable {
  let id: String
  let description: String
  let skills: [String]
  let sourceQuote: String
}

struct CareerTarget: Codable {
  let title: String
  let sourceText: String
  let sourceUrl: String?
  let requirements: [CareerRequirement]
  let updatedAt: Int
}

struct CareerRecommendations: Decodable {
  let data: [CareerProject]
  let total: Int
  let targetUpdatedAt: Int
  let profileUpdatedAt: Int
  let nearbyRequestsAvailable: Bool
}

struct CareerProject: Decodable {
  struct RequirementLink: Decodable {
    struct ActivityLink: Decodable {
      let activityId: String
      let skills: [String]
    }
    let requirementId: String
    let skills: [String]
    let gapSkillsWithPractice: [String]
    let activityLinks: [ActivityLink]
  }
  let id: String
  let source: String
  let title: String
  let description: String
  let activities: [ProjectActivity]
  let listing: Listing?
  let actionIneligibleReasons: [String]
  let requirementLinks: [RequirementLink]
  var stableId: String { "\(source):\(id)" }
}

struct OpportunityInput: Codable, Equatable {
  var title = ""
  var description = ""
  var city = "Calgary"
  var remote = false
  var kind = "volunteer"
  var essentialTechnologies: [String] = []
  var minimumWeeklyHours = 4
  var collaboration = "flexible"
  var interests: [String] = []
  var place: String?
  var latitude: Double?
  var longitude: Double?
  var compensation: String?
  var commitment: String?
}

struct Opportunity: Decodable, Identifiable {
  let revision: Int?
  let id: String
  let ownerId: String
  let title: String
  let description: String
  let city: String
  let remote: Bool
  let kind: String
  let essentialTechnologies: [String]
  let minimumWeeklyHours: Int
  let collaboration: String
  let interests: [String]
  let place: String?
  let latitude: Double?
  let longitude: Double?
  let compensation: String?
  let commitment: String?
  let status: String
  let analysis: Analysis

  var input: OpportunityInput {
    OpportunityInput(
      title: title, description: description, city: city,
      remote: remote, kind: kind, essentialTechnologies: essentialTechnologies,
      minimumWeeklyHours: minimumWeeklyHours, collaboration: collaboration,
      interests: interests, place: place, latitude: latitude, longitude: longitude,
      compensation: compensation, commitment: commitment)
  }
}

struct RequestInput: Codable, Equatable {
  var title = ""
  var description = ""
  var place = ""
  var latitude = 51.0447
  var longitude = -114.0719
}

struct CommunityRequest: Decodable, Identifiable {
  let revision: Int?
  let id: String
  let ownerId: String
  let ownerName: String
  let title: String
  let description: String
  let place: String
  let latitude: Double
  let longitude: Double
  let status: String
  let claimedBy: String?
  let claimantName: String?
  let analysis: Analysis

  var input: RequestInput {
    RequestInput(
      title: title, description: description, place: place,
      latitude: latitude, longitude: longitude)
  }
}

struct NearbyRequest: Decodable, Identifiable {
  let requestId: String
  let title: String
  let description: String
  let place: String
  let distanceKm: Double
  let score: Double
  let explanation: String
  var id: String { requestId }
}

struct MatchScores: Decodable {
  let technicalReadiness: Double
  let growthPotential: Double
  let developerInterest: Double
  let collaborationCompatibility: Double
  let opportunityExposure: Double
  var factors: [(String, Double)] {
    [
      ("Readiness", technicalReadiness), ("Growth", growthPotential),
      ("Shared interests", developerInterest), ("Collaboration", collaborationCompatibility),
      ("Exposure", opportunityExposure),
    ]
  }
}

struct DeveloperMatch: Decodable, Identifiable {
  let developerId: String
  let name: String
  let score: Double
  let scores: MatchScores
  let existingRelevantSkills: [String]
  let skillsToDevelop: [String]
  let explanation: String
  var id: String { developerId }
}

struct OwnMatch: Decodable {
  let data: DeveloperMatch?
  let ineligibleReasons: [String]
  let status: String
}

struct RequestEligibility: Decodable {
  let eligible: Bool
  let ineligibleReasons: [String]
}

struct Interest: Decodable, Identifiable {
  let id: String
  let opportunityId: String
  let developerId: String
  let title: String
  let developerName: String
  let requesterName: String
  let requesterInterested: Bool
  let developerInterested: Bool
  let connected: Bool
  func mine(_ role: Role?) -> Bool {
    switch role {
    case .requester: requesterInterested
    case .developer: developerInterested
    case nil: false
    }
  }
  func theirs(_ role: Role?) -> Bool {
    switch role {
    case .requester: developerInterested
    case .developer: requesterInterested
    case nil: false
    }
  }
}

struct MapFeed: Decodable {
  let listings: [Listing]
  let truncated: Bool
}

struct Listing: Decodable, Identifiable {
  let id: String
  let source: String
  let title: String
  let organization: String
  let neighbourhood: String
  let kind: String
  let compensation: String
  let commitment: String
  let skills: [String]
  let description: String
  let status: String
  let precise: Bool
  let viewerIsOwner: Bool
  let viewerHasClaimed: Bool
  let latitude: Double
  let longitude: Double
  var symbol: String { source == "request" ? "hands.sparkles" : "briefcase" }
}

func parseTags(_ value: String) -> [String] {
  var seen: Set<String> = []
  return value.split(separator: ",").compactMap {
    let tag = $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    return !tag.isEmpty && seen.insert(tag).inserted ? tag : nil
  }
}
