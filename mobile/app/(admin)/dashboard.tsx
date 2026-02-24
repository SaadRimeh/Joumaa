import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  AppButton,
  AppScreen,
  Card,
  EmptyState,
  InfoRow,
  LoadingState,
  SectionTitle,
  StatCard,
} from "@/src/components/ui";
import { useAdminNotifications } from "@/src/context/AdminNotificationsContext";
import { useAuth } from "@/src/context/AuthContext";
import { useSocketEvent } from "@/src/hooks/useSocketEvent";
import { adminApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { DashboardStats, DistributionItem } from "@/src/types/models";
import { formatCurrency, formatDateTime, formatNumber } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

export default function AdminDashboardScreen() {
  const { logout } = useAuth();
  const { notifications, unreadCount } = useAdminNotifications();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeEmployees: 0,
    totalAvailableStock: 0,
    todayDistributedQuantity: 0,
    todaySales: 0,
    currentKiloPrice: 0,
  });
  const [live, setLive] = useState<DistributionItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, liveData] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getLiveFeed(10),
      ]);
      setStats(statsData);
      setLive(liveData);
    } catch (error) {
      Alert.alert("خطأ", parseApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleStatsUpdated = useCallback((payload: DashboardStats) => {
    setStats(payload);
  }, []);

  const handleDistributionNew = useCallback((payload: DistributionItem) => {
    setLive((prev) => [payload, ...prev].slice(0, 10));
  }, []);

  useSocketEvent<DashboardStats>("stats:updated", handleStatsUpdated);
  useSocketEvent<DistributionItem>("distribution:new", handleDistributionNew);

  const latestReceivings = useMemo(
    () => notifications.filter((item) => item.type === "receiving").slice(0, 5),
    [notifications]
  );

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <AppScreen
      title="لوحة الأدمن"
      subtitle="متابعة شاملة لتوزيع الدجاج لحظة بلحظة"
      rightAction={<AppButton label="خروج" onPress={onLogout} variant="danger" />}
    >
      {loading ? <LoadingState /> : null}

      <View style={styles.gridRow}>
        <StatCard label="الموظفون النشطون" value={formatNumber(stats.activeEmployees)} />
        <StatCard label="سعر الكيلو الحالي" value={formatCurrency(stats.currentKiloPrice)} accent="warning" />
      </View>
      <View style={styles.gridRow}>
        <StatCard label="إجمالي المتوفر" value={`${formatNumber(stats.totalAvailableStock)} كغ`} accent="success" />
        <StatCard label="الموزع اليوم" value={`${formatNumber(stats.todayDistributedQuantity)} كغ`} accent="primary" />
      </View>
      <View style={styles.gridRow}>
        <StatCard label="مبيعات اليوم" value={formatCurrency(stats.todaySales)} accent="danger" />
      </View>

      <Card>
        <SectionTitle title="إجراءات سريعة" />
        <View style={styles.quickActions}>
          <AppButton label="إدارة الموظفين" onPress={() => router.push("/(admin)/employees")} />
          <AppButton label="البث الحي" onPress={() => router.push("/(admin)/live")} variant="secondary" />
          <AppButton label="التقارير" onPress={() => router.push("/(admin)/reports")} variant="secondary" />
          <AppButton label="التجار" onPress={() => router.push("/(admin)/merchants")} variant="secondary" />
          <AppButton
            label={unreadCount > 0 ? `الإشعارات (${formatNumber(unreadCount)})` : "الإشعارات"}
            onPress={() => router.push("/(admin)/notifications" as never)}
            variant="secondary"
          />
        </View>
      </Card>

      <Card>
        <SectionTitle title="آخر عمليات التوزيع" subtitle="تحديث فوري عبر Socket" />
        {live.length === 0 ? (
          <EmptyState title="لا توجد عمليات حتى الآن" subtitle="ستظهر العمليات هنا مباشرة عند التوزيع" />
        ) : (
          live.map((item) => (
            <Pressable
              key={item._id}
              style={styles.liveItem}
              onPress={() => router.push("/(admin)/live")}
            >
              <InfoRow label="الموظف" value={typeof item.employeeId === "string" ? "-" : item.employeeId.name} />
              <InfoRow label="التاجر" value={item.merchantName} />
              <InfoRow label="الكمية" value={`${formatNumber(item.quantity)} كغ`} />
              <InfoRow label="الإجمالي" value={formatCurrency(item.totalAmount)} />
              <Text style={styles.liveTime}>{formatDateTime(item.createdAt)}</Text>
            </Pressable>
          ))
        )}
      </Card>

      <Card>
        <SectionTitle title="آخر عمليات الاستلام" subtitle="تفاصيل فورية عند أي استلام جديد" />
        {latestReceivings.length === 0 ? (
          <EmptyState title="لا يوجد استلامات حديثة" subtitle="ستظهر التفاصيل هنا مباشرة عند الاستلام" />
        ) : (
          latestReceivings.map((item) => (
            <Pressable
              key={item.id}
              style={styles.liveItem}
              onPress={() => router.push("/(admin)/notifications" as never)}
            >
              <Text style={styles.receivingTitle}>{item.title}</Text>
              <Text style={styles.receivingMessage}>{item.message}</Text>
              <Text style={styles.liveTime}>{formatDateTime(item.createdAt)}</Text>
            </Pressable>
          ))
        )}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  gridRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  quickActions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  liveItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fcfcfc",
    gap: 4,
  },
  liveTime: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
    textAlign: "right",
  },
  receivingTitle: {
    color: colors.text,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "800",
  },
  receivingMessage: {
    color: colors.text,
    textAlign: "right",
    fontSize: 13,
    lineHeight: 20,
  },
});
