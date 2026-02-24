import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";

interface ScreenProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppScreen({
  title,
  subtitle,
  rightAction,
  children,
  scroll = true,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = Math.max(insets.bottom + 88, 108);

  const content = (
    <View style={[styles.content, style]}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightAction ? <View>{rightAction}</View> : null}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

export function AppButton({ label, onPress, disabled, variant = "primary" }: ButtonProps) {
  const buttonStyle = [
    styles.button,
    variant === "primary" && styles.primaryButton,
    variant === "secondary" && styles.secondaryButton,
    variant === "danger" && styles.dangerButton,
    disabled && styles.buttonDisabled,
  ];

  const textStyle = [
    styles.buttonText,
    variant === "secondary" && styles.secondaryButtonText,
    disabled && styles.buttonTextDisabled,
  ];

  return (
    <Pressable style={buttonStyle} onPress={onPress} disabled={disabled}>
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "phone-pad";
  secureTextEntry?: boolean;
  multiline?: boolean;
}

export function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  multiline,
}: InputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        textAlign="right"
      />
    </View>
  );
}

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface StatCardProps {
  label: string;
  value: string;
  accent?: "primary" | "success" | "warning" | "danger";
}

export function StatCard({ label, value, accent = "primary" }: StatCardProps) {
  const accentStyle = {
    primary: styles.primaryAccent,
    success: styles.successAccent,
    warning: styles.warningAccent,
    danger: styles.dangerAccent,
  }[accent];

  return (
    <View style={[styles.statCard, accentStyle]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function SectionTitle({ title, subtitle, right }: SectionTitleProps) {
  return (
    <View style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

interface RowProps {
  label: string;
  value: string;
  valueStyle?: StyleProp<TextStyle>;
}

export function InfoRow({ label, value, valueStyle }: RowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

interface LoadingProps {
  label?: string;
}

export function LoadingState({ label = "جاري التحميل..." }: LoadingProps) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

interface EmptyProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyProps) {
  return (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerTextContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "right",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  sectionHead: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    textAlign: "right",
  },
  button: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 86,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.soft,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  buttonTextDisabled: {
    color: "#d1d5db",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text,
    textAlign: "right",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: colors.text,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 85,
    textAlignVertical: "top",
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  primaryAccent: {
    borderColor: "#0d9488",
    backgroundColor: "#f0fdfa",
  },
  successAccent: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  warningAccent: {
    borderColor: "#d97706",
    backgroundColor: "#fffbeb",
  },
  dangerAccent: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  statLabel: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "right",
  },
  statValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "right",
    flex: 1,
  },
  infoValue: {
    color: colors.text,
    fontSize: 14,
    textAlign: "left",
    fontWeight: "700",
  },
  loadingContainer: {
    paddingVertical: 36,
    gap: 10,
    alignItems: "center",
  },
  loadingLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 22,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
});
