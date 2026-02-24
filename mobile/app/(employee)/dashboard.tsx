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
import { useAuth } from "@/src/context/AuthContext";
import { useSocketEvent } from "@/src/hooks/useSocketEvent";
import { employeeApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { DistributionItem, EmployeeDashboardData, ReceivingItem } from "@/src/types/models";
import { openDialer } from "@/src/utils/contact";
import { handleEmployeeAccessError } from "@/src/utils/employeeAccess";
import { formatCurrency, formatDateTime, formatNumber } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

export default function EmployeeDashboardScreen() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<EmployeeDashboardData | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await employeeApi.getDashboard();
      setDashboard(data);
    } catch (error) {
      if (
        handleEmployeeAccessError(error, {
          onSessionRevoked: () => {
            logout().catch(() => undefined);
          },
        })
      ) {
        return;
      }
      Alert.alert("خطأ", parseApiError(error));
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onPriceUpdated = useCallback(() => {
    Alert.alert("تحديث السعر", "تم تحديث سعر الكيلو من قبل الأدمن");
    load();
  }, [load]);

  const onDistributionNew = useCallback(
    (payload: DistributionItem) => {
      const currentEmployeeId =
        dashboard?.profile.id ||
        (typeof payload.employeeId === "string" ? payload.employeeId : payload.employeeId._id);
      const payloadEmployeeId =
        typeof payload.employeeId === "string" ? payload.employeeId : payload.employeeId._id;
      if (currentEmployeeId === payloadEmployeeId) {
        load();
      }
    },
    [dashboard?.profile.id, load]
  );

  const onReceivingNew = useCallback(
    (payload: ReceivingItem) => {
      const payloadEmployeeId =
        typeof payload.employeeId === "string" ? payload.employeeId : payload.employeeId._id;
      if (dashboard?.profile.id === payloadEmployeeId) {
        load();
      }
    },
    [dashboard?.profile.id, load]
  );

  const onStockLow = useCallback(() => {
    Alert.alert("تنبيه مخزون", "الرصيد منخفض. يرجى طلب استلام جديد من المدجنة.");
  }, []);

  useSocketEvent("price:updated", onPriceUpdated);
  useSocketEvent<DistributionItem>("distribution:new", onDistributionNew);
  useSocketEvent<ReceivingItem>("receiving:new", onReceivingNew);
  useSocketEvent("stock:low", onStockLow);

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const isInactive = Boolean(dashboard && !dashboard.profile.isActive);
  const supportPhone = dashboard?.supportContact?.phone || "";

  const warningMessage = useMemo(() => {
    if (!dashboard || dashboard.profile.isActive) {
      return "";
    }

    const supportName = dashboard.supportContact?.name || "الأستاذ جمعة";
    return `أنت تم إيقافك مؤقتًا، يرجى الاتصال مع ${supportName}${
      supportPhone ? ` على الرقم ${supportPhone}` : ""
    }.`;
  }, [dashboard, supportPhone]);

  return (
    <AppScreen
      title="لوحة الموظف"
      subtitle="متابعة التوزيع والمخزون"
      rightAction={<AppButton label="خروج" onPress={onLogout} variant="danger" />}
    >
      {loading ? <LoadingState /> : null}

      {dashboard ? (
        <>
          {isInactive ? (
            <Card style={styles.warningCard}>
              <SectionTitle title="إيقاف مؤقت" />
              <Text style={styles.warningText}>{warningMessage}</Text>
              {supportPhone ? (
                <AppButton
                  label="اتصال بالأدمن"
                  variant="secondary"
                  onPress={() => {
                    openDialer(supportPhone).catch(() => undefined);
                  }}
                />
              ) : null}
            </Card>
          ) : null}

          <Card>
            <SectionTitle title={dashboard.profile.name} subtitle={`الكود: ${dashboard.profile.uniqueCode}`} />
            <InfoRow label="رقم الجوال" value={dashboard.profile.phone} />
            <InfoRow label="السيارة" value={dashboard.profile.car} />
          </Card>

          <View style={styles.row}>
            <StatCard
              label="المستلم من المدجنة"
              value={`${formatNumber(dashboard.indicators.totalReceived)} كغ`}
              accent="success"
            />
            <StatCard
              label="الموزع للتجار"
              value={`${formatNumber(dashboard.indicators.totalDistributed)} كغ`}
            />
          </View>
          <View style={styles.row}>
            <StatCard
              label="الرصيد المتبقي"
              value={`${formatNumber(dashboard.indicators.currentStock)} كغ`}
              accent={dashboard.indicators.isLowStock ? "danger" : "warning"}
            />
            <StatCard
              label="سعر الكيلو"
              value={formatCurrency(dashboard.indicators.currentKiloPrice)}
              accent="warning"
            />
          </View>

          <Card>
            <SectionTitle title="إجراءات سريعة" />
            <View style={styles.quick}>
              <AppButton
                label="استلام كمية جديدة"
                onPress={() => router.push("/(employee)/receive")}
                disabled={isInactive}
              />
              <AppButton
                label="توزيع جديد"
                onPress={() => router.push("/(employee)/new-distribution")}
                variant="secondary"
                disabled={isInactive}
              />
              <AppButton
                label="سجل التوزيع"
                onPress={() => router.push("/(employee)/history")}
                variant="secondary"
              />
              <AppButton
                label="المخزون"
                onPress={() => router.push("/(employee)/inventory")}
                variant="secondary"
              />
            </View>
          </Card>

          <Card>
            <SectionTitle title="آخر 5 توزيعات" />
            {dashboard.lastDistributions.length === 0 ? (
              <EmptyState title="لا توجد توزيعات حتى الآن" />
            ) : (
              dashboard.lastDistributions.map((item) => (
                <Pressable key={item._id} style={styles.item} onPress={() => router.push("/(employee)/history")}>
                  <InfoRow label="التاجر" value={item.merchantName} />
                  <InfoRow label="الكمية" value={`${formatNumber(item.quantity)} كغ`} />
                  <InfoRow label="الإجمالي" value={formatCurrency(item.totalAmount)} />
                  <InfoRow
                    label="الرصيد بعد التوزيع"
                    value={`${formatNumber(item.employeeStockAfter)} كغ`}
                  />
                  <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
                </Pressable>
              ))
            )}
          </Card>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  warningCard: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },
  warningText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "right",
  },
  row: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  quick: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  item: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    gap: 4,
    backgroundColor: "#fff",
  },
  time: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "right",
  },
});
