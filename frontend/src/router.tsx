import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Home } from "@/pages/Home";
import { WorkForm } from "@/pages/WorkForm";
import { WorkOverview } from "@/pages/WorkOverview";
import { Outline } from "@/components/outline/Outline";
import { ChapterEditor } from "@/pages/ChapterEditor";
import { CharacterList } from "@/pages/CharacterList";
import { CharacterEditor } from "@/pages/CharacterEditor";
import { ProtagonistEditor } from "@/pages/ProtagonistEditor";
import { EventList } from "@/pages/EventList";
import { EventEditor } from "@/pages/EventEditor";
import { StateTracker } from "@/pages/StateTracker";
import { Settings } from "@/pages/Settings";
import { AISettings } from "@/pages/AISettings";
import { PromptManagement } from "@/pages/PromptManagement";
import { PromptAssemblyEditorPage } from "@/pages/PromptAssemblyEditorPage";
import { AILogs } from "@/pages/AILogs";
import { AILogDetail } from "@/pages/AILogDetail";

function WorkOutlinePage() {
  const { wid } = useParams<{ wid: string }>();
  return <Outline workId={Number(wid)} />;
}
function WorkCharactersPage() {
  const { wid } = useParams<{ wid: string }>();
  return <CharacterList workId={Number(wid)} />;
}
function WorkCharacterEditorPage() {
  return <CharacterEditor />;
}
function WorkProtagonistPage() {
  return <ProtagonistEditor />;
}
function WorkEventsPage() {
  const { wid } = useParams<{ wid: string }>();
  return <EventList workId={Number(wid)} />;
}
function WorkEventEditorPage() {
  return <EventEditor />;
}
function WorkStatesPage() {
  const { wid } = useParams<{ wid: string }>();
  return <StateTracker workId={Number(wid)} />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "settings", element: <Settings /> },
      { path: "settings/ai", element: <AISettings /> },
      { path: "prompts", element: <PromptManagement /> },
      {
        path: "prompts/fragments",
        element: <Navigate to="/prompts?tab=fragments" replace />,
      },
      {
        path: "prompts/assemblies",
        element: <Navigate to="/prompts?tab=assemblies" replace />,
      },
      { path: "prompts/assemblies/:id", element: <PromptAssemblyEditorPage /> },
      {
        path: "prompts/:name",
        element: <Navigate to="/prompts?tab=bindings" replace />,
      },
      { path: "ai-logs", element: <AILogs /> },
      { path: "ai-logs/:id", element: <AILogDetail /> },
      { path: "works/new", element: <WorkForm /> },
      { path: "works/:wid/edit", element: <WorkForm /> },
      { path: "works/:wid", element: <WorkOverview /> },
      { path: "works/:wid/outline", element: <WorkOutlinePage /> },
      { path: "works/:wid/characters", element: <WorkCharactersPage /> },
      { path: "works/:wid/characters/:cid", element: <WorkCharacterEditorPage /> },
      { path: "works/:wid/characters/:cid/edit", element: <WorkCharacterEditorPage /> },
      { path: "works/:wid/protagonists", element: <WorkProtagonistPage /> },
      { path: "works/:wid/events", element: <WorkEventsPage /> },
      { path: "works/:wid/events/:eid", element: <WorkEventEditorPage /> },
      { path: "works/:wid/states", element: <WorkStatesPage /> },
      { path: "works/:wid/chapters/:cid", element: <ChapterEditor /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);