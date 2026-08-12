export interface Protagonist {
  id: number;
  work_id: number;
  character_id: number;
  core_conflict?: string | null;
  external_goal?: string | null;
  internal_goal?: string | null;
  ghost?: string | null;
  wound?: string | null;
  lie_believed?: string | null;
  truth_needed?: string | null;
  arc_summary?: string | null;
  key_relationships?: string | null;
  special_abilities?: string | null;
  pov_label?: string | null;
  created_at: string;
  updated_at: string;
}

export type ProtagonistCreate = Omit<Protagonist, "id" | "work_id" | "created_at" | "updated_at">;
export type ProtagonistUpdate = Partial<Omit<ProtagonistCreate, "character_id">>;