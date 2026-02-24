import { useEffect } from "react";
import { router } from "expo-router";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { LoadingState } from "@/src/components/ui";
import { colors } from "@/src/theme/colors";

export default function Index() {
  const { loading, token, role } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    const timer = setTimeout(() => {
      if (!token) {
        router.replace("/login");
        return;
      }

      if (role === "admin") {
        router.replace("/(admin)/dashboard");
      } else {
        router.replace("/(employee)/dashboard");
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [loading, role, token]);

  return (
    <ImageBackground source={require("@/assets/images/splash-icon.png")} style={styles.background}>
      <View style={styles.overlay}>
        <Text style={styles.title}>نظام توزيع الدجاج</Text>
        <Text style={styles.subtitle}>من المدجنة إلى التاجر - متابعة فورية</Text>
        <LoadingState label="جاري تجهيز التطبيق..." />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(15, 118, 110, 0.85)",
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#e5fffb",
    fontSize: 15,
    marginBottom: 16,
    textAlign: "center",
  },
});
