import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  pageName: string;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class PageErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Page rendering failed: ${this.props.pageName}`, error, info.componentStack);
  }

  private retry = () => this.setState({ failed: false });

  render() {
    if (this.state.failed) {
      return (
        <section role="alert" className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center gap-4 rounded-2xl border border-rose-400/20 bg-slate-950/70 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-300" />
          <div>
            <h2 className="text-lg font-semibold text-white">{this.props.pageName} didn’t load</h2>
            <p className="mt-2 text-sm text-slate-300">Something went wrong on this page. You can retry it or move to another section.</p>
          </div>
          <button type="button" onClick={this.retry} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            <RotateCcw className="h-4 w-4" /> Retry page
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
