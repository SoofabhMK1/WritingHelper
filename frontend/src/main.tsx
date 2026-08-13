import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import "antd/dist/reset.css";
import "./index.css";

import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useUiStore } from "./store/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemedApp() {
  const mode = useUiStore((s) => s.theme);
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: "#5b21b6" },
      }}
    >
      <div data-theme={mode} style={{ minHeight: "100vh" }}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </div>
    </ConfigProvider>
  );
}

window.addEventListener("unhandledrejection", (event) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledrejection]", event.reason);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemedApp />
    </QueryClientProvider>
  </React.StrictMode>
);