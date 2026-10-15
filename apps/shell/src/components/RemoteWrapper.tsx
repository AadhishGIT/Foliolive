import React, { Component, type ReactNode, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@foliolive/ui';
import { AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface ErrorBoundaryProps {
  remoteName: string;
  children: ReactNode;
  fallbackComponent?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class RemoteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[MFE Error] Remote ${this.props.remoteName} failed to load:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }
      return (
        <Card className="border-rose-900/60 bg-rose-950/20">
          <CardHeader>
            <CardTitle className="text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Micro-Frontend Unavailable: {this.props.remoteName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-300">
              The remote container for{' '}
              <span className="font-mono text-white">{this.props.remoteName}</span> could not be
              loaded. Verify the remote dev server or container is running.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-slate-950 p-3 rounded border border-slate-800 text-rose-300 overflow-x-auto font-mono">
                {this.state.error.message}
              </pre>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

export function RemoteLoadingFallback({ remoteName }: { remoteName: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg bg-slate-100/50 dark:bg-slate-900/30">
      <Layers className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-pulse mb-3" />
      <span className="text-sm font-medium text-slate-800 dark:text-slate-300">
        Loading {remoteName}...
      </span>
      <span className="text-xs text-slate-600 dark:text-slate-400 mt-1">
        Resolving Module Federation remote container
      </span>
    </div>
  );
}

export function RemoteWrapper({
  remoteName,
  children,
  fallback,
}: {
  remoteName: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RemoteErrorBoundary remoteName={remoteName} fallbackComponent={fallback}>
      <Suspense fallback={<RemoteLoadingFallback remoteName={remoteName} />}>{children}</Suspense>
    </RemoteErrorBoundary>
  );
}
