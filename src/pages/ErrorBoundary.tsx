import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertOctagon } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[StudyRoom] Unhandled render error:", error, info.componentStack);
  }

  handleReload = (): void => {
    this.setState({ hasError: false });
    window.location.href = "/beranda";
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950 px-6 text-center">
        <div className="rounded-full bg-danger/10 p-4 text-danger">
          <AlertOctagon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold text-ink">Terjadi kesalahan tak terduga</h1>
        <p className="max-w-sm text-sm text-muted">
          Halaman mengalami error dan tidak bisa ditampilkan. Ini sudah tercatat — coba muat ulang.
        </p>
        <button
          onClick={this.handleReload}
          className="mt-2 rounded-lg bg-cyan px-4 py-2.5 text-sm font-semibold text-navy-950 hover:bg-cyan/90"
        >
          Muat ulang ke beranda
        </button>
      </div>
    );
  }
}
