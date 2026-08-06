import { Component, type ReactNode } from 'react';
import { PatchuuLogo } from './PatchuuLogo';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4">
          <div className="bg-cardstock rounded-2xl p-8 shadow-paper max-w-md w-full text-center">
            <PatchuuLogo height={64} className="mx-auto mb-6" />
            <h1 className="font-heading text-2xl font-bold text-ink mb-3">
              Something went wrong
            </h1>
            <p className="text-ink-muted mb-6">
              We're sorry, but we couldn't load this page. Please try refreshing or come back later.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-2.5 bg-ink text-white rounded-xl font-semibold hover:bg-ink/90 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-cardstock border border-ink/10 text-ink rounded-xl font-semibold hover:bg-ink/5 transition-colors"
              >
                Refresh page
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 text-left text-xs bg-gray-50 p-4 rounded-lg overflow-auto text-red-600">
                {this.state.error.toString()}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
