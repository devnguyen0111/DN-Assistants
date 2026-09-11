import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

const COPY = {
  en: {
    title: "Something went wrong",
    desc: "DN Assistant hit a render error. Try reloading the window.",
    reload: "Reload",
  },
  vi: {
    title: "Đã xảy ra lỗi",
    desc: "DN Assistant gặp lỗi khi hiển thị. Hãy tải lại cửa sổ.",
    reload: "Tải lại",
  },
};

function detectLocale(): "vi" | "en" {
  try {
    const stored = localStorage.getItem("dn-assistant-locale");
    if (stored === "vi" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return "vi";
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DN Assistant render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const t = COPY[detectLocale()];
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: 24,
            fontFamily: "Segoe UI, system-ui, sans-serif",
            background: "#111827",
            color: "#f3f4f6",
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>{t.title}</h1>
          <p style={{ opacity: 0.8, marginBottom: 16 }}>{t.desc}</p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#1f2937",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{
              marginTop: 16,
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "#38bdf8",
              color: "#0f172a",
              cursor: "pointer",
              fontWeight: 600,
            }}
            onClick={() => window.location.reload()}
          >
            {t.reload}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
