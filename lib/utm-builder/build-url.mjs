/**
 * Webpack may resolve `@/lib/utm-builder/build-url` to `.mjs` before `.ts`.
 * Re-export the full module so client components get all exports (not a partial server copy).
 */
export {
  EMPTY_UTM,
  normalizeUtmParams,
  urlContainsUtmParams,
  buildUtmUrl,
  parseUtmUrl,
  hasRequiredUtm,
  getExistingUtmKeys,
  formatUrlForCopy,
  buildContentVariantLinks,
  breakdownUrl,
  landingPageToUrl,
  reconstructTaggedUrl,
} from "./build-url.ts";
