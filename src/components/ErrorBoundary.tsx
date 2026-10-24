import { Component, type ReactNode } from "react";

interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="boot-shell" role="alert">
          <div className="boot-wordmark">CUTROOM</div>
          <div className="boot-line">Something unexpected broke the editor.</div>
          <div className="boot-line" style={{ maxWidth: 420 }}>{this.state.error.message}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <button type="button" className="btn primary" onClick={() => window.location.reload()}>
              Reload CUTROOM
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
