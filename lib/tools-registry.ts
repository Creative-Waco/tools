export type ToolTag =
  | "Newsletter"
  | "Social"
  | "Membership"
  | "Marketing"
  | "Analytics";

export type ToolKind = "tool" | "dashboard";

export type Tool = {
  id: string;
  name: string;
  path: string;
  description: string;
  tag: ToolTag;
  kind: ToolKind;
};

export const TOOLS: Tool[] = [
  {
    id: "rss-email",
    name: "RSS Email HTML Generator",
    path: "/rss-email/",
    description:
      "Turn an events RSS feed into HubSpot-ready HTML with dates, images, and ticket links.",
    tag: "Newsletter",
    kind: "tool",
  },
  {
    id: "event-cards",
    name: "Event Card Graphics",
    path: "/event-cards/",
    description:
      "Ticket-style Instagram cards (1080×1350, 4:5 export) from the events RSS feed.",
    tag: "Social",
    kind: "tool",
  },
  {
    id: "sparks-dashboard",
    name: "Creative Spark Dashboard",
    path: "/sparks-dashboard/",
    description:
      "Track Creative Spark membership growth, tier mix, and member event momentum.",
    tag: "Membership",
    kind: "dashboard",
  },
  {
    id: "utm-builder",
    name: "Campaign Builder",
    path: "/utm-builder/",
    description:
      "Build campaigns with multiple UTM links, track performance in GA4, and compare against benchmarks in Airtable.",
    tag: "Marketing",
    kind: "tool",
  },
  {
    id: "analytics-dashboard",
    name: "Analytics Dashboard",
    path: "/analytics-dashboard/",
    description:
      "GA4 overview for creativewaco.org — sessions, channels, top pages, and referrers.",
    tag: "Analytics",
    kind: "dashboard",
  },
  {
    id: "insights",
    name: "Insights",
    path: "/insights/",
    description:
      "Search Console keyword opportunities and GA4 traffic patterns — quick wins, cannibalization, audience, and channels.",
    tag: "Analytics",
    kind: "dashboard",
  },
];

export const DASHBOARDS = TOOLS.filter((tool) => tool.kind === "dashboard");
export const UTILITY_TOOLS = TOOLS.filter((tool) => tool.kind === "tool");
