import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { AppButton, AppScreen, Card, InfoRow, LoadingState, SectionTitle } from "@/src/components/ui";
import { employeeApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { InventoryStatusData } from "@/src/types/models";
import { handleEmployeeAccessError } from "@/src/utils/employeeAccess";
import { formatNumber } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

export default function EmployeeInventoryScreen() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InventoryStatusData | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await employeeApi.getInventory();
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
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const distributionRate = useMemo(() => {
    if (!data || data.totalReceived <= 0) {
      return 0;
    }
    return Math.min(100, (data.totalDistributed / data.totalReceived) * 100);
  }, [data]);

  return (
    <AppScreen title="حالة المخزون" subtitle="متابعة الرصيد والتنبيهات">
      {loading ? <LoadingState /> : null}
      {data ? (
        <>
          <Card>
            <SectionTitle title="ملخص المخزون" />
            <InfoRow label="الرصيد الحالي" value={`${formatNumber(data.currentStock)} كغ`} />
            <InfoRow label="إجمالي المستلم" value={`${formatNumber(data.totalReceived)} كغ`} />
            <InfoRow label="إجمالي الموزع" value={`${formatNumber(data.totalDistributed)} كغ`} />
            <InfoRow label="حد التنبيه" value={`${formatNumber(data.lowStockThreshold)} كغ`} />
            <InfoRow
              label="الحالة"
              value={data.isLowStock ? "منخفض" : "جيد"}
              valueStyle={{ color: data.isLowStock ? colors.danger : colors.success }}
            />
            <Text style={styles.recommendation}>{data.recommendedAction}</Text>
          </Card>

          <Card>
            <SectionTitle title="نسبة التوزيع من المخزون" />
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${distributionRate}%` }]} />
            </View>
            <Text style={styles.progressText}>{distributionRate.toFixed(1)}%</Text>
          </Card>

          <Card>
            <SectionTitle title="إجراء مقترح" />
            <AppButton
              label="استلام كمية جديدة من المدجنة"
              onPress={() => router.push("/(employee)/receive")}
            />
          </Card>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  recommendation: {
    color: colors.muted,
    textAlign: "right",
    lineHeight: 20,
    fontSize: 13,
  },
  progressTrack: {
    height: 14,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  progressText: {
    marginTop: 6,
    textAlign: "right",
    color: colors.text,
    fontWeight: "800",
  },
});
