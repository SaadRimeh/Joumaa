import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AppButton, AppScreen, Card, EmptyState, SectionTitle } from "@/src/components/ui";
import {
  AdminNotificationItem,
  useAdminNotifications,
} from "@/src/context/AdminNotificationsContext";
import { formatDateTime } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

function notificationTone(type: AdminNotificationItem["type"]): string {
  if (type === "receiving") {
    return "استلام";
  }
  if (type === "distribution") {
    return "توزيع";
  }
  if (type === "stock-low") {
    return "تنبيه";
  }
  if (type === "price") {
    return "سعر";
  }
  return "نظام";
}

export default function AdminNotificationsScreen() {
  const { notifications, unreadCount, markAllAsRead, clearNotifications } = useAdminNotifications();

  useFocusEffect(
    useCallback(() => {
      markAllAsRead();
    }, [markAllAsRead])
  );

  const latest = useMemo(() => notifications.slice(0, 120), [notifications]);

  return (
    <AppScreen title="إشعارات الأدمن" subtitle={`غير المقروء: ${unreadCount}`}>
      <Card>
        <SectionTitle title="إدارة الإشعارات" />
        <View style={styles.actions}>
          <AppButton label="مسح الإشعارات" onPress={clearNotifications} variant="danger" />
        </View>
      </Card>

      <Card>
        <SectionTitle title="سجل العمليات" subtitle={`الإجمالي: ${latest.length}`} />
        {latest.length === 0 ? (
          <EmptyState
            title="لا توجد إشعارات حاليًا"
            subtitle="ستظهر هنا تلقائيًا عند أي عملية جديدة"
          />
        ) : null}

        {latest.map((item) => (
          <Pressable key={item.id} style={[styles.item, !item.read ? styles.unread : null]}>
            <View style={styles.header}>
              <Text style={styles.type}>{notificationTone(item.type)}</Text>
              <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
          </Pressable>
        ))}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row-reverse",
    gap: 8,
    flexWrap: "wrap",
  },
  item: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff",
    gap: 5,
  },
  unread: {
    borderColor: "#14b8a6",
    backgroundColor: "#f0fdfa",
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  type: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  time: {
    color: colors.muted,
    fontSize: 11,
  },
  title: {
    color: colors.text,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "800",
  },
  message: {
    color: colors.text,
    textAlign: "right",
    fontSize: 13,
    lineHeight: 20,
  },
});
