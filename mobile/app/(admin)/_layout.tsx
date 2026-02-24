import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { useAdminNotifications } from "@/src/context/AdminNotificationsContext";
import { colors } from "@/src/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminLayout() {
  const { loading, token, role } = useAuth();
  const { unreadCount } = useAdminNotifications();
  const insets = useSafeAreaInsets();

  if (loading) {
    return null;
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  if (role !== "admin") {
    return <Redirect href="/(employee)/dashboard" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          height: 62 + insets.bottom,
          paddingBottom: Math.max(insets.bottom + 6, 12),
          paddingTop: 8,
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: "الموظفون",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "مباشر",
          tabBarIcon: ({ color, size }) => <Ionicons name="radio-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "التقارير",
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "الإشعارات",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "الإعدادات",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="employee/[id]" options={{ href: null }} />
      <Tabs.Screen name="merchants" options={{ href: null }} />
    </Tabs>
  );
}
