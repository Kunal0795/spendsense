import { Component } from "react";
import { AlertTriangle } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
    this.handleRetry = this.handleRetry.bind(this);
  }

  // Called during rendering when a descendant throws
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Called after rendering when a descendant throws — ideal for logging
  componentDidCatch(error, info) {
    // Offline-only app: log to console only, never send anywhere
    console.error("[ErrorBoundary] Caught render error:", error, info);
  }

  handleRetry() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message =
      this.state.error?.message || "An unexpected error occurred.";

    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white px-6 py-12 dark:bg-gray-950">
        {/* Warning icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle
            className="h-8 w-8 text-amber-500 dark:text-amber-400"
            strokeWidth={1.75}
          />
        </div>

        {/* Heading */}
        <h1 className="text-center text-xl font-semibold text-gray-900 dark:text-gray-100">
          Something went wrong
        </h1>

        {/* Error detail */}
        <p className="max-w-xs text-center text-sm text-gray-400 dark:text-gray-500">
          {message}
        </p>

        {/* Retry button */}
        <button
          type="button"
          onClick={this.handleRetry}
          className="mt-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:active:bg-indigo-700"
        >
          Tap to retry
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
