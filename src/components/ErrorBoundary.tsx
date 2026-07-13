import { Component, type ReactNode } from "react";
import { C, bodyFont, displayFont } from "./theme";
import { describeError } from "../lib/errorMessage";

interface Props {
  children: ReactNode;
}

interface State {
  error: unknown;
}

/** Catches render-time exceptions anywhere below it. Without this, an
 * uncaught throw during render unmounts the whole tree and React 19 shows
 * nothing in production — just a blank page with no clue why. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled error in app render:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center px-6" style={{ background: C.ink, ...bodyFont }}>
          <div className="max-w-md rounded-md p-6" style={{ border: `1px solid ${C.clay}`, background: C.panel }}>
            <h1 style={{ ...displayFont, color: C.paper, fontSize: 22, fontWeight: 600 }} className="mb-3">
              Something went wrong
            </h1>
            <p style={{ color: C.clay, fontSize: 13.5 }} className="mb-4 leading-relaxed">
              {describeError(this.state.error)}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wide"
              style={{ ...bodyFont, background: C.verdigrisDeep, color: "white" }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
