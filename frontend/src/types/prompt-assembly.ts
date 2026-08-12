export type BuiltinSlot = "system" | "user_template";

export type BuiltinPromptName =
  | "outline"
  | "chapters"
  | "character"
  | "event"
  | "consistency"
  | "continue"
  | "expand"
  | "chat";

export interface FragmentPart {
  type: "fragment";
  fragment_id: number;
}

export interface BuiltinPart {
  type: "builtin";
  prompt_name: BuiltinPromptName;
  slot?: BuiltinSlot;
}

export interface TextPart {
  type: "text";
  body: string;
}

export interface VariablePart {
  type: "variable";
  name: string;
}

export type Part = FragmentPart | BuiltinPart | TextPart | VariablePart;

export interface PromptAssembly {
  id: number;
  name: string;
  description: string | null;
  system_parts: Part[];
  user_parts: Part[];
  sample_vars: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type PromptAssemblyCreate = Omit<
  PromptAssembly,
  "id" | "created_at" | "updated_at"
>;

export type PromptAssemblyUpdate = Partial<PromptAssemblyCreate>;

export interface AssemblyRenderResult {
  system: string;
  user: string;
}