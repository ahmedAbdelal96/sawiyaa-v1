import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type BoundaryProps = {
  children: React.ReactNode;
  onBack: () => void;
};

type Props = BoundaryProps & {
  copy: { title: string; body: string; back: string; retry: string };
};

type State = {
  error: Error | null;
};

class RuntimeErrorBoundaryImpl extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Sawiyaa mobile render error", error, info.componentStack);
  }

  retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container} testID="runtime-error-fallback">
        <Text style={styles.title}>{this.props.copy.title}</Text>
        <Text style={styles.body}>{this.props.copy.body}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={this.props.onBack}>
            <Text style={styles.secondaryText}>{this.props.copy.back}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={this.retry}>
            <Text style={styles.primaryText}>{this.props.copy.retry}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

export function RuntimeErrorBoundary(props: BoundaryProps) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar") ?? false;
  const copy = isArabic
    ? {
        title: "حدث خطأ ما",
        body: "تعذر عرض هذه الشاشة. حاول مرة أخرى أو ارجع للخلف.",
        back: "رجوع",
        retry: "إعادة المحاولة",
      }
    : {
        title: "Something went wrong",
        body: "This screen could not be displayed. Please try again or go back.",
        back: "Back",
        retry: "Retry",
      };
  return <RuntimeErrorBoundaryImpl {...props} copy={copy} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7F4EE",
  },
  title: { color: "#1F332F", fontSize: 20, fontWeight: "700", textAlign: "center" },
  body: { color: "#53635D", fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: "center" },
  actions: { flexDirection: "row", gap: 12, marginTop: 24 },
  primaryButton: { backgroundColor: "#24564F", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  secondaryButton: { borderColor: "#24564F", borderRadius: 10, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 12 },
  primaryText: { color: "#FFFFFF", fontWeight: "700" },
  secondaryText: { color: "#24564F", fontWeight: "700" },
});
