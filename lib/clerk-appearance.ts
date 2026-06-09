import { shadcn } from "@clerk/ui/themes";

/** Horizontal black logo (from creativewaco.org), served from `public/`. */
export const CREATIVE_WACO_HORIZONTAL_LOGO = "/creative-waco-logo-horizontal.avif";

export const clerkAppearance = {
  theme: shadcn,
  options: {
    unsafe_disableDevelopmentModeWarnings: true,
    logoImageUrl: CREATIVE_WACO_HORIZONTAL_LOGO,
    logoLinkUrl: "https://tools.creativewaco.org/",
  },
  elements: {
    logoBox: "h-10 justify-center",
    logoImage: "h-8 w-auto max-w-[140px] object-contain",
  },
};
