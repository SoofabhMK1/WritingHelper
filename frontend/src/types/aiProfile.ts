export interface AIProfileSummary {
  id: number;
  name: string;
  provider: string;
  model: string;
  is_default: boolean;
  has_api_key: boolean;
}

export interface AIProfile {
  id: number;
  name: string;
  provider: string;
  base_url: string;
  model: string;
  temperature: number;
  is_default: boolean;
  has_api_key: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AIProfileCreate {
  name: string;
  provider?: string;
  base_url: string;
  model: string;
  temperature?: number;
  api_key?: string | null;
  is_default?: boolean;
}

export interface AIProfileUpdate {
  name?: string;
  provider?: string;
  base_url?: string;
  model?: string;
  temperature?: number;
  api_key?: string | null;
  is_default?: boolean;
}

/** ``prompt_name -> profile_id`` (``null`` = use default). */
export type AssignmentMap = Record<string, number | null>;