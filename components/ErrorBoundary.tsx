import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { errorHandler } from '@/lib/errors';
import { getThemeColors } from '@/lib/ThemeContext';
import { ErrorNotificationBridge } from './ErrorNotificationBridge';

interface Props {
  children: ReactNode;
  component?: string;
  userId?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // componentDidCatch cannot be async, so we handle the promise with .catch()
    // This ensures errors are logged even if the async handler fails
    errorHandler.handle(error, {
      operation: 'component_render',
      component: this.props.component || 'unknown',
      userId: this.props.userId,
      metadata: {
        errorInfo,
        componentStack: errorInfo.componentStack
      }
    }).then((appError) => {
      // Display error in UI via bridge (ErrorBoundary is outside ErrorNotificationProvider)
      ErrorNotificationBridge.showError(appError);
    }).catch((handlerError) => {
      // Fallback logging if error handler itself fails
      console.error('[ErrorBoundary] Failed to handle error:', handlerError);
      console.error('[ErrorBoundary] Original error:', error);
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallbackUI
          onRetry={this.handleRetry}
          component={this.props.component}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI
 */
function ErrorFallbackUI({
  onRetry,
  component
}: {
  onRetry: () => void;
  component?: string;
}) {
  // Use default light theme colors - ErrorBoundary may be outside ThemeProvider
  const colors = getThemeColors(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Something went wrong
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {component ? `Error in ${component} component` : 'An unexpected error occurred'}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRetry}
          >
            <Text style={[styles.retryText, { color: colors.white }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  actions: {
    width: '100%',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}






