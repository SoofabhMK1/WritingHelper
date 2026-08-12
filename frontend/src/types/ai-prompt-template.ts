export interface PromptTemplateBinding {
  prompt_name: string;
  assembly_id: number | null;
  updated_at: string;
}

export interface PromptTemplateBindingsResponse {
  bindings: Record<string, number | null>;
}

export interface BuiltinPromptSummary {
  name: string;
  json_mode: boolean;
  temperature: number;
}

export interface BuiltinPromptDetail extends BuiltinPromptSummary {
  system: string;
  user_template: string;
}

export interface CloneBuiltinPromptRequest {
  name: string;
  description?: string | null;
}
