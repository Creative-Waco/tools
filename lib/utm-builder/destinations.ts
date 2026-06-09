export type DestinationShortcut = {
  id: string;
  label: string;
  url: string;
};

export const DESTINATION_SHORTCUTS: DestinationShortcut[] = [
  {
    id: "home",
    label: "Home",
    url: "https://creativewaco.org/",
  },
  {
    id: "events",
    label: "Events",
    url: "https://creativewaco.org/events",
  },
  {
    id: "spark",
    label: "Spark",
    url: "https://creativewaco.org/programs/spark",
  },
  {
    id: "about",
    label: "About",
    url: "https://creativewaco.org/about",
  },
];
