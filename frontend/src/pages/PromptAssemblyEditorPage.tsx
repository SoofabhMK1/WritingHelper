import { useParams } from "react-router-dom";
import { PromptAssemblyEditor } from "./PromptAssemblyEditor";

export function PromptAssemblyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const numericId = id === "new" ? undefined : Number(id);
  return <PromptAssemblyEditor assemblyId={numericId} standalone />;
}