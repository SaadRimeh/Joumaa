import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, router } from "expo-router";
import { Alert } from "react-native";
import { useCallback, useRef } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useSocketEvent } from "@/src/hooks/useSocketEvent";
import { openDialer } from "@/src/utils/contact";
import { colors } from "@/src/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface EmployeeStatusPayload {
  isActive?: boolean;
  message?: string;
  adminPhone?: string;
}

interface EmployeeSessionRevokedPayload {
  message?: string;
}

export default function EmployeeLayout() {
  const { loading, token, role, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const hasHandledRevocationRef = useRef(false);

  const handleStatusUpdated = useCallback((payload: EmployeeStatusPayload) => {
    if (payload?.isActive) {
      Alert.alert("تم التفعيل", payload.message || "تم تفعيل حسابك ويمكنك متابعة العمل.");
      return;
    }

    const warningMessage = payload?.message || "أنت موقوف مؤقتًا. يرجى التواصل مع الأدمن.";
    const adminPhone = payload?.adminPhone || "";

    Alert.alert("إيقاف مؤقت", warningMessage, [
      ...(adminPhone
        ? [
            {
              text: "اتصال",
              onPress: () => {
                openDialer(adminPhone).catch(() => undefined);
              },
            },
          ]
        : []),
      { text: "إغلاق", style: "cancel" },
    ]);
  }, []);

  const handleSessionRevoked = useCallback(
    (payload: EmployeeSessionRevokedPayload) => {
      if (hasHandledRevocationRef.current) {
        return;
      }

      hasHandledRevocationRef.current = true;
      Alert.alert(
        "تم إنهاء الجلسة",
        payload?.message || "تم حذف حسابك من النظام. سيتم تسجيل الخروج الآن.",
        [
          {
            text: "موافق",
            onPress: () => {
              logout()
                .catch(() => undefined)
                .finally(() => {
                  router.replace("/login");
                });
            },
          },
        ],
        { cancelable: false }
      );
    },
    [logout]
  );

  useSocketEvent<EmployeeStatusPayload>("employee:status-updated", handleStatusUpdated);
  useSocketEvent<EmployeeSessionRevokedPayload>("employee:session-revoked", handleSessionRevoked);

  if (loading) {
    return null;
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  if (role !== "employee") {
    return <Redirect href="/(admin)/dashboard" />;
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
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-distribution"
        options={{
          title: "توزيع جديد",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "السجل",
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "المخزون",
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="merchants"
        options={{
          title: "التجار",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="receive" options={{ href: null }} />
    </Tabs>
  );
}
