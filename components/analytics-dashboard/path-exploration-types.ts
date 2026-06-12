export type PathExplorationNode = {
  id: string;
  path: string;
  label: string;
  value: number;
  step: number;
  metric: "sessions";
  isMore?: boolean;
};

export type PathExplorationColumn = {
  stepIndex: number;
  nodes: PathExplorationNode[];
  loading: boolean;
  selectedPath: string | null;
};

export type PathExplorationLandingsResponse = {
  propertyId: string;
  program: { id: string; name: string };
  dateRange: { startDate: string; endDate: string };
  mode: "landings";
  pathSteps: [];
  nodes: PathExplorationNode[];
  fetchedAt: string;
  error?: string;
};

export type PathExplorationNextResponse = {
  propertyId: string;
  program: { id: string; name: string };
  dateRange: { startDate: string; endDate: string };
  mode: "next";
  pathSteps: string[];
  nodes: PathExplorationNode[];
  fetchedAt: string;
  error?: string;
};

export type PathExplorationResponse =
  | PathExplorationLandingsResponse
  | PathExplorationNextResponse;
