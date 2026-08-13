import type { AIProfileSummary, AssignmentMap } from "./aiProfile";

/** Returned by ``GET /api/v1/ai/status``. */
export interface AIStatus {
  configured: boolean;
  base_url: string;
  model: string;
  temperature: number;
  provider: string;
  default_profile_id: number | null;
  default_profile_name: string | null;
  profiles: AIProfileSummary[];
  /** ``prompt_name -> profile_id`` (``null`` = "use default"). */
  assignments: AssignmentMap;
}