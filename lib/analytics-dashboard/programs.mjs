/** Program path filters for scoped GA4 reports. */
export const PROGRAMS = {
  all: {
    id: "all",
    name: "All site",
    description: "Entire creativewaco.org property",
    pathPattern: null,
    gscPageContains: null,
  },
  "creative-spark": {
    id: "creative-spark",
    name: "Creative Spark",
    description:
      "Membership pages — who visits, how they arrive, what they do, and where they go next",
    pathPattern:
      "^/(creative-spark|programs/spark|spark|sparks-only|sparksonly|es/spark|sparks)(/|$)",
    referrerContains: "creativewaco.org/spark",
    gscPageContains: [
      "/programs/spark",
      "/creative-spark",
      "/sparks-only",
      "/sparksonly",
      "/spark",
      "/es/spark",
    ],
  },
  events: {
    id: "events",
    name: "Events",
    description: "Event detail and listing pages",
    pathPattern: "^/event(/|$)",
    referrerContains: "creativewaco.org/event",
    gscPageContains: ["/event/"],
  },
  "dia-de-los-muertos": {
    id: "dia-de-los-muertos",
    name: "Día de los Muertos",
    description: "Día de los Muertos program pages",
    pathPattern:
      "^/(dia-de-los-muertos|diadelosmuertos|events/dia-de-los-muertos|es/dia-de-los-muertos)(/|$)",
    referrerPattern:
      "creativewaco.org/(dia-de-los-muertos|diadelosmuertos|events/dia-de-los-muertos)",
    gscPageContains: [
      "/dia-de-los-muertos",
      "/diadelosmuertos",
      "/events/dia-de-los-muertos",
    ],
  },
  levitt: {
    id: "levitt",
    name: "Levitt",
    description: "Levitt Amphitheater program pages",
    pathPattern: "^/levitt(/|$)",
    referrerContains: "creativewaco.org/levitt",
    gscPageContains: ["/levitt"],
  },
  artprenticeship: {
    id: "artprenticeship",
    name: "Artprenticeship",
    description: "Artprenticeship program pages",
    pathPattern: "^/artprenticeship(/|$)",
    referrerContains: "creativewaco.org/artprenticeship",
    gscPageContains: ["/artprenticeship"],
  },
  "waco-wonderland": {
    id: "waco-wonderland",
    name: "Waco Wonderland",
    description: "Waco Wonderland Parade program pages",
    pathPattern: "^/waco-wonderland-parade(/|$)",
    referrerContains: "creativewaco.org/waco-wonderland",
    gscPageContains: ["/waco-wonderland"],
  },
  sponsorship: {
    id: "sponsorship",
    name: "Sponsorship",
    description: "Sponsorship and sponsor pages across all programs",
    pathPattern: "sponsor",
    referrerPattern: "sponsor",
    gscPageContains: ["/sponsor", "/sponsorship"],
  },
};

export function getProgram(programId) {
  const id = programId?.trim() || "all";
  return PROGRAMS[id] ?? PROGRAMS.all;
}

export function listPrograms() {
  return Object.values(PROGRAMS);
}
