import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
import { useSocketEvent } from "@/src/hooks/useSocketEvent";
import { adminApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { DistributionItem } from "@/src/types/models";
import { formatCurrency, formatDateTime, formatNumber, paymentStatusLabel } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

export default function AdminLiveMonitorScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DistributionItem[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [merchantFilter, setMerchantFilter] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getLiveFeed(120);
      setItems(data);
    } catch (error) {
      Alert.alert("خطأ", parseApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDistributionNew = useCallback((payload: DistributionItem) => {
    setItems((prev) => [payload, ...prev].slice(0, 200));
  }, []);

  useSocketEvent<DistributionItem>("distribution:new", onDistributionNew);

  const filtered = useMemo(() => {
    const employee = employeeFilter.trim().toLowerCase();
    const merchant = merchantFilter.trim().toLowerCase();
    return items.filter((item) => {
      const employeeName =
        typeof item.employeeId === "string" ? "" : item.employeeId.name.toLowerCase();
      const merchantName = item.merchantName.toLowerCase();
      const employeeMatch = employee ? employeeName.includes(employee) : true;
      const merchantMatch = merchant ? merchantName.includes(merchant) : true;
      return employeeMatch && merchantMatch;
    });
  }, [employeeFilter, items, merchantFilter]);

  return (
    <AppScreen title="مراقبة التوزيع المباشر" subtitle="جميع عمليات التوزيع لحظة بلحظة">
      <Card>
        <SectionTitle title="فلترة العمليات" />
        <AppInput label="اسم الموظف" value={employeeFilter} onChangeText={setEmployeeFilter} placeholder="اختياري" />
        <AppInput label="اسم التاجر" value={merchantFilter} onChangeText={setMerchantFilter} placeholder="اختياري" />
        <AppButton label="تحديث من السيرفر" onPress={load} variant="secondary" />
      </Card>

      <Card>
        <SectionTitle title="التدفق الحي" subtitle={`عدد النتائج: ${filtered.length}`} />
        {loading ? <LoadingState /> : null}
        {!loading && filtered.length === 0 ? (
          <EmptyState title="لا توجد نتائج مطابقة" subtitle="غيّر الفلاتر أو انتظر عمليات جديدة" />
        ) : null}

        {filtered.map((item) => (
          <View key={item._id} style={styles.item}>
            <InfoRow label="الموظف" value={typeof item.employeeId === "string" ? "-" : item.employeeId.name} />
            <InfoRow label="التاجر" value={item.merchantName} />
            <InfoRow label="الكمية" value={`${formatNumber(item.quantity)} كغ`} />
            <InfoRow label="السعر الإجمالي" value={formatCurrency(item.totalAmount)} />
            <InfoRow label="حالة الدفع" value={paymentStatusLabel(item.paymentStatus)} />
            <InfoRow label="الرصيد قبل" value={`${formatNumber(item.employeeStockBefore)} كغ`} />
            <InfoRow label="الرصيد بعد" value={`${formatNumber(item.employeeStockAfter)} كغ`} />
            {item.location?.address ? <InfoRow label="الموقع" value={item.location.address} /> : null}
            <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
          </View>
        ))}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    backgroundColor: "#fff",
    gap: 4,
  },
  time: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "right",
  },
});
