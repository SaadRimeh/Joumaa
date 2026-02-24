import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import * as Linking from "expo-linking";
import { useFocusEffect } from "@react-navigation/native";
import {
  AppButton,
  AppScreen,
  Card,
  EmptyState,
  InfoRow,
  LoadingState,
  SectionTitle,
} from "@/src/components/ui";
import { useAdminNotifications } from "@/src/context/AdminNotificationsContext";
import { useAuth } from "@/src/context/AuthContext";
import { adminApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { AnyReportResponse, DailyReportResponse, EmployeesReportResponse, MerchantsReportResponse } from "@/src/types/models";
import { formatCurrency, formatDateTime, formatNumber } from "@/src/utils/format";

type ReportType = "daily" | "employees" | "merchants";

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  daily: "يومي",
  employees: "أداء الموظفين",
  merchants: "التجار",
};

const TOTAL_KEY_LABELS: Record<string, string> = {
  totalQuantity: "إجمالي الكمية",
  totalSales: "إجمالي المبيعات",
  totalTransactions: "إجمالي العمليات",
  totalReceived: "إجمالي المستلم",
  totalDistributed: "إجمالي الموزع",
};

function getTotalLabel(key: string): string {
  return TOTAL_KEY_LABELS[key] || key;
}

function getTotalValue(key: string, value: number): string {
  if (key.toLowerCase().includes("sales")) {
    return formatCurrency(value);
  }
  return formatNumber(value);
}

function normalizeWhatsAppPhone(phone: string): string {
  const sanitized = phone.replace(/[^\d+]/g, "");
  if (sanitized.startsWith("+")) {
    return sanitized.slice(1);
  }

  const digitsOnly = sanitized.replace(/\D/g, "");
  if (digitsOnly.startsWith("00")) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.startsWith("0")) {
    return `963${digitsOnly.slice(1)}`;
  }
  return digitsOnly;
}

function getTypeLabel(type: ReportType): string {
  return REPORT_TYPE_LABELS[type];
}

function buildWhatsAppReportText(report: AnyReportResponse): string {
  const lines: string[] = [
    `تقرير ${getTypeLabel(report.type)}`,
    `بداية الفترة: ${formatDateTime(report.range.start)}`,
    `نهاية الفترة: ${formatDateTime(report.range.end)}`,
    "",
    "ملخص:",
  ];

  Object.entries(report.totals).forEach(([key, value]) => {
    lines.push(`- ${getTotalLabel(key)}: ${getTotalValue(key, Number(value) || 0)}`);
  });

  lines.push("");

  if (report.type === "daily") {
    lines.push("أعلى التجار:");
    report.byMerchant.slice(0, 3).forEach((row, index) => {
      lines.push(
        `${index + 1}. ${row.merchantName} - ${formatNumber(row.totalQuantity)} كغ - ${formatCurrency(
          row.totalSales
        )}`
      );
    });
  } else if (report.type === "employees") {
    lines.push("أفضل أداء موظفين:");
    report.employees.slice(0, 3).forEach((row, index) => {
      lines.push(
        `${index + 1}. ${row.name} - ${formatNumber(row.periodDistributed || 0)} كغ - ${formatCurrency(
          row.periodSales || 0
        )}`
      );
    });
  } else {
    lines.push("أعلى التجار:");
    report.merchants.slice(0, 3).forEach((row, index) => {
      lines.push(
        `${index + 1}. ${row.merchantName} - ${formatNumber(row.totalQuantity)} كغ - ${formatCurrency(
          row.totalSales
        )}`
      );
    });
  }

  return lines.join("\n");
}

export default function AdminReportsScreen() {
  const { user } = useAuth();
  const { pushNotification } = useAdminNotifications();
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState<AnyReportResponse | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      let data: AnyReportResponse;

      if (reportType === "daily") {
        data = (await adminApi.getDailyReport()) as DailyReportResponse;
      } else if (reportType === "employees") {
        data = (await adminApi.getEmployeesReport()) as EmployeesReportResponse;
      } else {
        data = (await adminApi.getMerchantsReport()) as MerchantsReportResponse;
      }

      setReport(data);
    } catch (error) {
      Alert.alert("خطأ", parseApiError(error));
    } finally {
      setLoading(false);
    }
  }, [reportType]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalsRows = useMemo(() => {
    if (!report) {
      return [];
    }
    return Object.entries(report.totals).map(([key, value]) => ({ key, value }));
  }, [report]);

  const onSendWhatsApp = async () => {
    if (!report) {
      Alert.alert("تنبيه", "حمّل التقرير أولاً ثم أرسله عبر واتساب");
      return;
    }

    const adminPhone = user?.phone || "";
    if (!adminPhone.trim()) {
      Alert.alert("تنبيه", "رقم الأدمن غير متوفر في الحساب الحالي");
      return;
    }

    try {
      setSending(true);
      const message = buildWhatsAppReportText(report);
      const safePhone = normalizeWhatsAppPhone(adminPhone);
      if (!safePhone) {
        throw new Error("تعذر تجهيز رقم واتساب للأدمن");
      }
      const encodedText = encodeURIComponent(message);
      const appUrl = `whatsapp://send?phone=${safePhone}&text=${encodedText}`;
      const webUrl = `https://wa.me/${safePhone}?text=${encodedText}`;

      const canOpenApp = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpenApp ? appUrl : webUrl);
      pushNotification({
        type: "system",
        title: "تقرير واتساب جاهز",
        message: "تم فتح واتساب مع نص التقرير، ويمكنك الإرسال الآن يدوياً للأدمن.",
        vibrate: false,
      });
    } catch (error) {
      Alert.alert("فشل إرسال التقرير", parseApiError(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppScreen title="التقارير والإحصائيات" subtitle="تقارير يومية ومتقدمة بالكامل بالعربية">
      <Card>
        <SectionTitle title="اختيار نوع التقرير" />
        <View style={styles.typeRow}>
          <AppButton
            label="يومي"
            onPress={() => setReportType("daily")}
            variant={reportType === "daily" ? "primary" : "secondary"}
          />
          <AppButton
            label="أداء الموظفين"
            onPress={() => setReportType("employees")}
            variant={reportType === "employees" ? "primary" : "secondary"}
          />
          <AppButton
            label="التجار"
            onPress={() => setReportType("merchants")}
            variant={reportType === "merchants" ? "primary" : "secondary"}
          />
        </View>
        <AppButton label="تحديث التقرير" onPress={load} variant="secondary" />
      </Card>

      <Card>
        <SectionTitle title="ملخص التقرير" />
        {loading ? <LoadingState /> : null}
        {!loading && !report ? <EmptyState title="لا يوجد بيانات" /> : null}
        {!loading && report ? (
          <>
            <InfoRow label="نوع التقرير" value={getTypeLabel(report.type)} />
            <InfoRow label="بداية الفترة" value={formatDateTime(report.range.start)} />
            <InfoRow label="نهاية الفترة" value={formatDateTime(report.range.end)} />
            {totalsRows.map((item) => (
              <InfoRow
                key={item.key}
                label={getTotalLabel(item.key)}
                value={getTotalValue(item.key, Number(item.value) || 0)}
              />
            ))}
          </>
        ) : null}
      </Card>

      <Card>
        <SectionTitle title="أعلى النتائج" subtitle="أول 10 صفوف" />
        {!report ? <EmptyState title="اختر تقريراً أولاً" /> : null}

        {report?.type === "daily"
          ? report.byMerchant.slice(0, 10).map((row) => (
              <Pressable key={row.merchantId} style={styles.item}>
                <InfoRow label="التاجر" value={row.merchantName} />
                <InfoRow label="الكمية" value={`${formatNumber(row.totalQuantity)} كغ`} />
                <InfoRow label="المبيعات" value={formatCurrency(row.totalSales)} />
              </Pressable>
            ))
          : null}

        {report?.type === "employees"
          ? report.employees.slice(0, 10).map((row) => (
              <Pressable key={row.employeeId} style={styles.item}>
                <InfoRow label="الموظف" value={row.name} />
                <InfoRow label="التوزيع" value={`${formatNumber(row.periodDistributed || 0)} كغ`} />
                <InfoRow label="المبيعات" value={formatCurrency(row.periodSales || 0)} />
              </Pressable>
            ))
          : null}

        {report?.type === "merchants"
          ? report.merchants.slice(0, 10).map((row) => (
              <Pressable key={row.merchantId} style={styles.item}>
                <InfoRow label="التاجر" value={row.merchantName} />
                <InfoRow label="الكمية" value={`${formatNumber(row.totalQuantity)} كغ`} />
                <InfoRow label="المبيعات" value={formatCurrency(row.totalSales)} />
              </Pressable>
            ))
          : null}
      </Card>

      <Card>
        <SectionTitle title="مشاركة عبر واتساب" subtitle="فتح واتساب مباشرة مع نص التقرير الجاهز (للأدمن فقط)" />
        <AppButton
          label={sending ? "جاري تجهيز الرسالة..." : "فتح واتساب مع التقرير"}
          onPress={onSendWhatsApp}
          disabled={sending || !report}
          variant="secondary"
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  typeRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  item: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    gap: 3,
    backgroundColor: "#fff",
  },
});
