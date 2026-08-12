export interface PromptFragment {
  id: number;
  name: string;
  body: string;
  description: string | null;
  tags_json: string | null;
  created_at: string;
  updated_at: string;
}

export type PromptFragmentCreate = Omit<
  PromptFragment,
  "id" | "created_at" | "updated_at"
>;

export type PromptFragmentUpdate = Partial<PromptFragmentCreate>;