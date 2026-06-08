export type ToolTag = "Newsletter" | "Social" | "Membership";

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
      "4:5 portrait cards from the events RSS feed — photo and title only, ready to export.",
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
];
