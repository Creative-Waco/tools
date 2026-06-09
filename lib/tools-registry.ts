export type ToolTag = "Newsletter" | "Social" | "Membership" | "Marketing";

export type Tool = {
  id: string;
  name: string;
  path: string;
  description: string;
  tag: ToolTag;
};

export const TOOLS: Tool[] = [
  {
    id: "rss-email",
    name: "RSS Email HTML Generator",
    path: "/rss-email/",
    description:
      "Turn an events RSS feed into HubSpot-ready HTML with dates, images, and ticket links.",
    tag: "Newsletter",
  },
  {
    id: "event-cards",
    name: "Event Card Graphics",
    path: "/event-cards/",
    description:
      "Ticket-style Instagram cards (1080×1350, 4:5 export) from the events RSS feed.",
    tag: "Social",
  },
  {
    id: "sparks-dashboard",
    name: "Creative Spark Dashboard",
    path: "/sparks-dashboard/",
    description:
      "Track Creative Spark membership growth, tier mix, and member event momentum.",
    tag: "Membership",
  },
  {
    id: "utm-builder",
    name: "UTM URL Builder",
    path: "/utm-builder/",
    description:
      "Build campaign-tagged links with UTM parameters for newsletters, social, and paid ads.",
    tag: "Marketing",
  },
];
