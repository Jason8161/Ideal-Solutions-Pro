import React, { Component, type ErrorInfo, type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = PropsWithChildren;

type State = {
  error: Error | null;
};

/**
 * Catches render/init JS errors at the app root so TestFlight builds show a retry
 * screen instead of a white screen or instant quit when Hermes reports an exception.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error("[RootErrorBoundary]", error, info.componentStack);
    }
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            Ideal Solutions Pro hit an unexpected error on startup. Tap retry or fully close and reopen the app.
          </Text>
          {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
          <Pressable accessibilityRole="button" onPress={this.handleRetry} style={styles.button}>
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#141210",
  },
  title: {
    color: "#f5f5f5",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    color: "#d0d0d0",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  detail: {
    color: "#a8a8a8",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#c9a227",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#141210",
    fontSize: 16,
    fontWeight: "700",
  },
});
