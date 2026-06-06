import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4">{this.state.error?.message}</p>
            <button onClick={() => globalThis.location.reload()} className="btn btn-primary">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
