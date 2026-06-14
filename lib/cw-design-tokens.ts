/** JS mirror of brand hex constants for charts and data viz. */

export const CW_COLORS = {
  spark: "#e85d04",
  sparkSoft: "#fff4ec",
  sparkMuted: "#c44d03",
  honorary: "#6b5b95",
  honorarySoft: "#f0ecf8",
  honoraryMuted: "#574a78",
  success: "#2d6a4f",
  successSoft: "#eaf4ef",
  warning: "#b08900",
  warningSoft: "#faf6e8",
  info: "#3d5a80",
  infoSoft: "#eef2f7",
  ink: "#1a1a1a",
  line: "#e4dfd4",
  paper: "#f4f1ea",
  panel: "#ffffff",
} as const;

/** Paid membership tier colors (Spark dashboard donut). */
export const PAID_TIER_COLORS = {
  bronze: "#a47148",
  silver: "#8d99ae",
  gold: "#e9c46a",
} as const;

/** Honorary membership tier colors. */
export const HONORARY_TIER_COLORS = {
  bronze: "#9a86b8",
  silver: "#7f6fa3",
  gold: "#b09ad0",
} as const;
