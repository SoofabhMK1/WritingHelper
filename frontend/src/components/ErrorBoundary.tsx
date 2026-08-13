import type { CSSProperties } from "react";
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const fallbackStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  padding: 24,
  fontFamily:
    "PingFang SC, Microsoft YaHei, -apple-system, BlinkMacSystemFont, sans-serif",
  color: "#1f1f1f",
  background: "#fafafa",
  textAlign: "center",
};

const errorBoxStyle: CSSProperties = {
  maxWidth: 640,
  padding: 16,
  borderRadius: 6,
  background: "#fff1f0",
  border: "1px solid #ffccc7",
  color: "#a8071a",
  fontSize: 13,
  whiteSpace: "pre-wrap",
  textAlign: "left",
};

const buttonStyle: CSSProperties = {
  padding: "8px 16px",
  margin: "0 6px",
  border: "1px solid #d9d9d9",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] caught:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={fallbackStyle} role="alert">
          <h1 style={{ margin: 0, fontSize: 22 }}>页面遇到错误</h1>
          <p style={{ margin: 0, color: "#595959" }}>
            出了点问题，请尝试刷新或回到首页。
          </p>
          {this.state.error ? (
            <pre style={errorBoxStyle}>{this.state.error.message}</pre>
          ) : null}
          <div>
            <button style={buttonStyle} onClick={this.handleReload}>
              刷新页面
            </button>
            <button style={buttonStyle} onClick={this.handleHome}>
              回到首页
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}