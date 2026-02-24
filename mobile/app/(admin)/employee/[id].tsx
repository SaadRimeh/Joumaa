import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AppButton,
  AppScreen,
  Card,
  EmptyState,
  InfoRow,
  LoadingState,
  SectionTitle,
} from "@/src/components/ui";
import { adminApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { EmployeeDetailsResponse, EmployeeDistributionsResponse } from "@/src/types/models";
import { openDialer, openWhatsAppChat } from "@/src/utils/contact";
import { formatCurrency, formatDateTime, formatNumber, paymentStatusLabel } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

function buildEmployeeWhatsAppReport(data: EmployeeDetailsResponse): string {
  const employee = data.employee;
  const distributions = data.distributions || [];
  const receivings = data.receivings || [];

  const totalDistributedQuantity = distributions.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalDistributedAmount = distributions.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  const totalReceivedQuantity = receivings.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const lines: string[] = [
    `تقرير عمليات الموظف: ${employee.name}`,
    `الهاتف: ${employee.phone}`,
    `الكود: ${employee.uniqueCode}`,
    "",
    `عدد عمليات التوزيع: ${formatNumber(distributions.length)}`,
    `إجمالي الكمية الموزعة: ${formatNumber(totalDistributedQuantity)} كغ`,
    `إجمالي قيمة التوزيع: ${formatCurrency(totalDistributedAmount)}`,
    `عدد عمليات الاستلام: ${formatNumber(receivings.length)}`,
    `إجمالي الكمية المستلمة: ${formatNumber(totalReceivedQuantity)} كغ`,
    "",
    "تفاصيل التوزيع:",
  ];

  if (distributions.length === 0) {
    lines.push("- لا توجد عمليات توزيع");
  } else {
    distributions.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${formatDateTime(item.createdAt)} | ${item.merchantName} | ${formatNumber(
          item.quantity
        )} كغ | ${formatCurrency(item.totalAmount)}`
      );
    });
  }

  lines.push("");
  lines.push("تفاصيل الاستلام:");

  if (receivings.length === 0) {
    lines.push("- لا توجد عمليات استلام");
  } else {
    receivings.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${formatDateTime(item.createdAt)} | ${formatNumber(item.quantity)} كغ | قبل ${formatNumber(
          item.stockBefore
        )} - بعد ${formatNumber(item.stockAfter)}`
      );
    });
  }

  return lines.join("\n");
}

export default function EmployeeDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const employeeId = String(params.id || "");
  const [loading, setLoading] = useState(true);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [data, setData] = useState<EmployeeDetailsResponse | null>(null);
  const [monthlyDistributions, setMonthlyDistributions] =
    useState<EmployeeDistributionsResponse | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) {
      return;
    }
    try {
      setLoading(true);
      const [details, monthly] = await Promise.all([
        adminApi.getEmployeeDetails(employeeId),
        adminApi.getEmployeeDistributions(employeeId, { period: "month", limit: 300 }),
      ]);
      setData(details);
      setMonthlyDistributions(monthly);
    } catch (error) {
      Alert.alert("خطأ", parseApiError(error));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const employee = data?.employee;

  const monthlyTotals = useMemo(
    () =>
      monthlyDistributions?.totals || {
        totalQuantity: 0,
        totalSales: 0,
        totalTransactions: 0,
      },
    [monthlyDistributions]
  );

  const onCallEmployee = useCallback(async () => {
    if (!employee?.phone) {
      Alert.alert("تنبيه", "رقم الموظف غير متوفر");
      return;
    }
    try {
      await openDialer(employee.phone);
    } catch (error) {
      Alert.alert("خطأ", parseApiError(error));
    }
  }, [employee?.phone]);

  const onSendWhatsAppReport = useCallback(async () => {
    if (!data?.employee?.phone) {
      Alert.alert("تنبيه", "رقم واتساب الموظف غير متوفر");
      return;
    }

    try {
      setSendingWhatsApp(true);
      const message = buildEmployeeWhatsAppReport(data);
      await openWhatsAppChat(data.employee.phone, message);
      Alert.alert("تم", "تم فتح واتساب على رقم الموظف مع التقرير الجاهز للإرسال");
    } catch (error) {
      Alert.alert("فشل الإرسال", parseApiError(error));
    } finally {
      setSendingWhatsApp(false);
    }
  }, [data]);

  return (
    <AppScreen
      title="تفاصيل الموظف"
      subtitle="سجل الاستلام والتوزيع"
      rightAction={<AppButton label="رجوع" onPress={() => router.back()} variant="secondary" />}
    >
      {loading ? <LoadingState /> : null}

      {!loading && employee ? (
        <>
          <Card>
            <SectionTitle title={employee.name} subtitle={`الكود: ${employee.uniqueCode}`} />
            <InfoRow label="رقم الجوال" value={employee.phone} />
            <InfoRow label="السيارة" value={employee.car} />
            <InfoRow
              label="الحالة"
              value={employee.isActive ? "نشط" : "موقوف"}
              valueStyle={{ color: employee.isActive ? colors.success : colors.danger }}
            />
            <InfoRow label="الرصيد الحالي" value={`${formatNumber(employee.currentStock)} كغ`} />
            <InfoRow label="إجمالي المستلم" value={`${formatNumber(employee.totalReceived)} كغ`} />
            <InfoRow label="إجمالي الموزع" value={`${formatNumber(employee.totalDistributed)} كغ`} />
            <View style={styles.actions}>
              <AppButton label="اتصال بالموظف" onPress={onCallEmployee} variant="secondary" />
              <AppButton
                label={sendingWhatsApp ? "جاري تجهيز التقرير..." : "واتساب تقرير الموظف"}
                onPress={onSendWhatsAppReport}
                disabled={sendingWhatsApp}
                variant="primary"
              />
            </View>
          </Card>

          <Card>
            <SectionTitle title="ملخص هذا الشهر" />
            <InfoRow label="عدد العمليات" value={formatNumber(monthlyTotals.totalTransactions)} />
            <InfoRow label="إجمالي الكمية" value={`${formatNumber(monthlyTotals.totalQuantity)} كغ`} />
            <InfoRow label="إجمالي المبالغ" value={formatCurrency(monthlyTotals.totalSales)} />
          </Card>

          <Card>
            <SectionTitle
              title="عمليات التوزيع خلال الشهر"
              subtitle={`عدد السجلات: ${monthlyDistributions?.rows.length || 0}`}
            />
            {(monthlyDistributions?.rows.length || 0) === 0 ? (
              <EmptyState title="لا توجد عمليات توزيع في هذا الشهر" />
            ) : (
              monthlyDistributions?.rows.map((item) => {
                const merchant = typeof item.merchantId === "string" ? null : item.merchantId;

                return (
                  <Pressable key={item._id} style={styles.item}>
                    <InfoRow label="التاجر" value={item.merchantName} />
                    <InfoRow label="الكمية" value={`${formatNumber(item.quantity)} كغ`} />
                    <InfoRow label="السعر الإجمالي" value={formatCurrency(item.totalAmount)} />
                    <InfoRow label="حالة الدفع" value={paymentStatusLabel(item.paymentStatus)} />
                    <InfoRow
                      label="الرصيد بعد العملية"
                      value={`${formatNumber(item.employeeStockAfter)} كغ`}
                    />
                    <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
                    {merchant?.phone ? (
                      <AppButton
                        label="اتصال بالتاجر"
                        variant="secondary"
                        onPress={() => {
                          openDialer(merchant.phone || "").catch(() => undefined);
                        }}
                      />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </Card>

          <Card>
            <SectionTitle title="سجل الاستلام من المدجنة" subtitle={`عدد السجلات: ${data.receivings.length}`} />
            {data.receivings.length === 0 ? (
              <EmptyState title="لا يوجد استلامات مسجلة" />
            ) : (
              data.receivings.map((item) => (
                <Pressable key={item._id} style={styles.item}>
                  <InfoRow label="الكمية المستلمة" value={`${formatNumber(item.quantity)} كغ`} />
                  <InfoRow label="الرصيد قبل" value={`${formatNumber(item.stockBefore)} كغ`} />
                  <InfoRow label="الرصيد بعد" value={`${formatNumber(item.stockAfter)} كغ`} />
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
  actions: {
    flexDirection: "row-reverse",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 6,
  },
  item: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fafafa",
    gap: 4,
  },
  time: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "right",
  },
});
