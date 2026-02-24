import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/src/context/AuthContext";
import { AdminNotificationsProvider } from "@/src/context/AdminNotificationsContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" hidden={false} translucent={false} />
      <AuthProvider>
        <AdminNotificationsProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade_from_bottom",
            }}
          />
        </AdminNotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
