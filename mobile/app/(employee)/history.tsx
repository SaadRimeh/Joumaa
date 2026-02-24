import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/src/context/AuthContext";
import {
  AppButton,
  AppInput,
  AppScreen,
  Card,
  EmptyState,
  InfoRow,
  LoadingState,
  SectionTitle,
} from "@/src/components/ui";
import { employeeApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { DistributionHistoryResponse } from "@/src/types/models";
import { handleEmployeeAccessError } from "@/src/utils/employeeAccess";
import { formatCurrency, formatDateTime, formatNumber, paymentStatusLabel } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

type Period = "day" | "week" | "month" | "all";

export default function EmployeeHistoryScreen() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("day");
  const [merchantFilter, setMerchantFilter] = useState("");
  const [data, setData] = useState<DistributionHistoryResponse | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await employeeApi.getDistributionHistory({
        period: period === "all" ? undefined : period,
        merchantName: merchantFilter.trim() || undefined,
        limit: 100,
        page: 1,
      });
      setData(result);
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
  }, [logout, merchantFilter, period]);

  const dailyChart = useMemo(() => {
    if (!data?.rows?.length) {
      return [];
    }

    const grouped = data.rows.reduce<Record<string, number>>((acc, item) => {
      const dayKey = new Date(item.createdAt).toISOString().slice(0, 10);
      acc[dayKey] = (acc[dayKey] || 0) + item.quantity;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([day, quantity]) => ({ day, quantity }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-7);
  }, [data?.rows]);

  const maxChartValue = useMemo(() => Math.max(1, ...dailyChart.map((item) => item.quantity)), [dailyChart]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <AppScreen title="سجل التوزيعات" subtitle="فلترة حسب اليوم/الأسبوع/الشهر/التاجر">
      <Card>
        <SectionTitle title="الفلاتر" />
        <View style={styles.filters}>
          <AppButton label="اليوم" onPress={() => setPeriod("day")} variant={period === "day" ? "primary" : "secondary"} />
          <AppButton label="الأسبوع" onPress={() => setPeriod("week")} variant={period === "week" ? "primary" : "secondary"} />
          <AppButton label="الشهر" onPress={() => setPeriod("month")} variant={period === "month" ? "primary" : "secondary"} />
          <AppButton label="الكل" onPress={() => setPeriod("all")} variant={period === "all" ? "primary" : "secondary"} />
        </View>
        <AppInput label="اسم التاجر" value={merchantFilter} onChangeText={setMerchantFilter} placeholder="اختياري" />
        <AppButton label="تطبيق الفلترة" onPress={load} variant="secondary" />
      </Card>

      <Card>
        <SectionTitle title="المجاميع" />
        {loading ? <LoadingState /> : null}
        {!loading && !data ? <EmptyState title="لا توجد بيانات" /> : null}
        {data ? (
          <>
            <InfoRow label="إجمالي العمليات" value={formatNumber(data.totals.totalTransactions)} />
            <InfoRow label="إجمالي الكمية" value={`${formatNumber(data.totals.totalQuantity)} كغ`} />
            <InfoRow label="إجمالي الإيرادات" value={formatCurrency(data.totals.totalAmount)} />
          </>
        ) : null}
      </Card>

      <Card>
        <SectionTitle title="رسم بياني للتوزيعات اليومية" subtitle="آخر 7 أيام (مبسّط)" />
        {dailyChart.length === 0 ? <EmptyState title="لا توجد بيانات رسم بياني" /> : null}
        {dailyChart.map((point) => {
          const widthPercent = Math.max(6, (point.quantity / maxChartValue) * 100);
          return (
            <View key={point.day} style={styles.chartRow}>
              <Text style={styles.chartLabel}>{point.day}</Text>
              <View style={styles.chartTrack}>
                <View style={[styles.chartFill, { width: `${widthPercent}%` }]} />
              </View>
              <Text style={styles.chartValue}>{formatNumber(point.quantity)} كغ</Text>
            </View>
          );
        })}
      </Card>

      <Card>
        <SectionTitle title="التفاصيل" subtitle={`النتائج: ${data?.rows.length || 0}`} />
        {!loading && data?.rows.length === 0 ? <EmptyState title="لا توجد عمليات في هذه الفترة" /> : null}
        {data?.rows.map((item) => (
          <Pressable key={item._id} style={styles.item}>
            <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
            <InfoRow label="التاجر" value={item.merchantName} />
            <InfoRow label="الكمية" value={`${formatNumber(item.quantity)} كغ`} />
            <InfoRow label="سعر الكيلو" value={formatCurrency(item.pricePerKilo)} />
            <InfoRow label="الإجمالي" value={formatCurrency(item.totalAmount)} />
            <InfoRow label="الرصيد بعد التوزيع" value={`${formatNumber(item.employeeStockAfter)} كغ`} />
            <InfoRow label="حالة الدفع" value={paymentStatusLabel(item.paymentStatus)} />
          </Pressable>
        ))}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  filters: {
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
  date: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "right",
  },
  chartRow: {
    gap: 6,
  },
  chartLabel: {
    color: colors.text,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "700",
  },
  chartTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  chartFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  chartValue: {
    color: colors.muted,
    textAlign: "right",
    fontSize: 12,
  },
});
