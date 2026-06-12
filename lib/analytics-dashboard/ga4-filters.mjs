import { getProgram } from "./programs.mjs";

export function buildPagePathFilter(programId) {
  const program = getProgram(programId);
  if (!program.pathPattern) return null;

  return {
    filter: {
      fieldName: "pagePath",
      stringFilter: {
        matchType: "PARTIAL_REGEXP",
        value: program.pathPattern,
      },
    },
  };
}

export function buildReferrerFromProgramFilter(programId) {
  const program = getProgram(programId);
  if (!program.referrerContains) return null;

  return {
    filter: {
      fieldName: "pageReferrer",
      stringFilter: {
        matchType: "CONTAINS",
        value: program.referrerContains,
      },
    },
  };
}

export function withFilter(baseRequest, dimensionFilter) {
  if (!dimensionFilter) return baseRequest;
  return { ...baseRequest, dimensionFilter };
}
