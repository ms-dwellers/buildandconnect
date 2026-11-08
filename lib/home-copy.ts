/** Landing page copy, kept in one place so tests and the page agree. */
export const homeCopy = {
  heading: ["Early-career developers,", "meet the people who need them."],
  lead: "Build & Connect matches developers starting out in Calgary with the community groups, non-profits, and small businesses that need a hand with technology, around shared interests and projects that make a difference.",
  ctas: {
    find: { label: "Find a project", href: "/map" },
    post: { label: "Post a request", href: "/requests/new" },
  },
  chairs: {
    developer: "I'm a developer",
    partner: "I need a developer",
  },
  ways: [
    {
      heading: ["A little experience.", "A lot to offer."],
      body: "You don't have to know everything to be useful. Pick a nearby request that fits your skills and interests, learn by shipping, and build a portfolio of work that mattered to someone.",
      link: "Explore nearby projects",
    },
    {
      heading: ["You bring the idea.", "We'll help you connect."],
      body: "A community group, a charity, a small business, or a neighbour with a problem worth solving. Describe what you need in plain language and put it on the map. No code required.",
      link: "Share a request",
    },
  ],
  join: "Your next chapter could start around the corner.",
} as const;
