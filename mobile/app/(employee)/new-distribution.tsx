import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/src/context/AuthContext";
import {
  AppButton,
  AppInput,
  AppScreen,
  Card,
  InfoRow,
  LoadingState,
  SectionTitle,
} from "@/src/components/ui";
import { employeeApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { EmployeeDashboardData, MerchantAggregateItem } from "@/src/types/models";
import { openDialer } from "@/src/utils/contact";
import { handleEmployeeAccessError } from "@/src/utils/employeeAccess";
import { formatCurrency, formatNumber } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

type PaymentStatus = "paid" | "credit" | "partial";

const PAYMENT_OPTIONS: { label: string; value: PaymentStatus }[] = [
  { label: "مدفوع", value: "paid" },
  { label: "آجل", value: "credit" },
  { label: "جزئي", value: "partial" },
];

export default function EmployeeNewDistributionScreen() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dashboard, setDashboard] = useState<EmployeeDashboardData | null>(null);
  const [merchantSuggestions, setMerchantSuggestions] = useState<MerchantAggregateItem[]>([]);

  const [merchantName, setMerchantName] = useState("");
  const [merchantPhone, setMerchantPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
  const [notes, setNotes] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, merchantsData] = await Promise.all([
        employeeApi.getDashboard(),
        employeeApi.getMerchants(),
      ]);
      setDashboard(dashboardData);
      setMerchantSuggestions(merchantsData);
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

  const quantityNumber = Number(quantity);
  const pricePerKilo = dashboard?.indicators.currentKiloPrice || 0;
  const availableStock = dashboard?.indicators.currentStock || 0;
  const totalPrice = Number.isFinite(quantityNumber) ? quantityNumber * pricePerKilo : 0;
  const remainingStock = Number.isFinite(quantityNumber) ? availableStock - quantityNumber : availableStock;

  const filteredSuggestions = useMemo(() => {
    const term = merchantName.trim().toLowerCase();
    if (!term) {
      return merchantSuggestions.slice(0, 6);
    }
    return merchantSuggestions
      .filter((item) => item.merchantName.toLowerCase().includes(term))
      .slice(0, 6);
  }, [merchantName, merchantSuggestions]);

  const isInactive = Boolean(dashboard && !dashboard.profile.isActive);
  const supportPhone = dashboard?.supportContact?.phone || "";
  const supportName = dashboard?.supportContact?.name || "الأستاذ جمعة";

  const onSubmit = async () => {
    if (isInactive) {
      Alert.alert(
        "إيقاف مؤقت",
        `أنت تم إيقافك مؤقتًا، يرجى الاتصال مع ${supportName}${
          supportPhone ? ` على الرقم ${supportPhone}` : ""
        }.`,
        [
          ...(supportPhone
            ? [
                {
                  text: "اتصال",
                  onPress: () => {
                    openDialer(supportPhone).catch(() => undefined);
                  },
                },
              ]
            : []),
          { text: "إغلاق", style: "cancel" },
        ]
      );
      return;
    }

    if (!merchantName.trim()) {
      Alert.alert("تنبيه", "اسم التاجر إلزامي");
      return;
    }

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      Alert.alert("تنبيه", "الكمية يجب أن تكون رقمًا موجبًا");
      return;
    }

    if (quantityNumber > availableStock) {
      Alert.alert("تنبيه", "لا يمكن توزيع كمية أكبر من الرصيد المتوفر");
      return;
    }

    try {
      setSubmitting(true);
      const result = await employeeApi.createDistribution({
        merchantName: merchantName.trim(),
        merchantPhone: merchantPhone.trim() || undefined,
        shopName: shopName.trim() || undefined,
        quantity: quantityNumber,
        paymentStatus,
        notes: notes.trim() || undefined,
        location: locationAddress.trim() ? { address: locationAddress.trim() } : undefined,
      });

      if (result.lowStockAlert) {
        Alert.alert("تنبيه مخزون", "تمت العملية لكن الرصيد أصبح أقل من 10%");
      } else {
        Alert.alert("تم", "تم حفظ عملية التوزيع بنجاح");
      }

      setQuantity("");
      setNotes("");
      setLocationAddress("");
      await load();
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
      Alert.alert("فشل العملية", parseApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen title="توزيع جديد على تاجر" subtitle="العملية الأساسية لتوزيع الدجاج">
      {loading ? <LoadingState /> : null}

      {isInactive ? (
        <Card style={styles.warningCard}>
          <SectionTitle title="إيقاف مؤقت" />
          <Text style={styles.warningText}>
            أنت تم إيقافك مؤقتًا، يرجى الاتصال مع {supportName}
            {supportPhone ? ` على الرقم ${supportPhone}` : ""}.
          </Text>
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
        <SectionTitle title="بيانات التاجر" />
        <AppInput label="اسم التاجر" value={merchantName} onChangeText={setMerchantName} placeholder="إلزامي" />
        <AppInput
          label="رقم الجوال"
          value={merchantPhone}
          onChangeText={setMerchantPhone}
          keyboardType="phone-pad"
          placeholder="اختياري"
        />
        <AppInput label="اسم المحل" value={shopName} onChangeText={setShopName} placeholder="اختياري" />

        <Text style={styles.suggestionTitle}>اقتراحات التجار</Text>
        <View style={styles.suggestions}>
          {filteredSuggestions.map((item) => (
            <Pressable
              key={item.merchantId}
              style={styles.suggestion}
              onPress={() => {
                setMerchantName(item.merchantName);
                setMerchantPhone(item.phone || "");
                setShopName(item.shopName || "");
              }}
            >
              <Text style={styles.suggestionText}>{item.merchantName}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle title="بيانات التوزيع" />
        <AppInput
          label="الكمية بالكيلو"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="مثال: 75"
        />
        <InfoRow label="سعر الكيلو الحالي" value={formatCurrency(pricePerKilo)} />
        <InfoRow label="السعر الإجمالي" value={formatCurrency(totalPrice)} />
        <InfoRow label="الرصيد المتوفر" value={`${formatNumber(availableStock)} كغ`} />
        <InfoRow
          label="الرصيد بعد التوزيع"
          value={`${formatNumber(Math.max(0, remainingStock))} كغ`}
          valueStyle={{ color: remainingStock < availableStock * 0.1 ? colors.danger : colors.text }}
        />

        <Text style={styles.suggestionTitle}>حالة الدفع</Text>
        <View style={styles.statusRow}>
          {PAYMENT_OPTIONS.map((option) => (
            <AppButton
              key={option.value}
              label={option.label}
              onPress={() => setPaymentStatus(option.value)}
              variant={paymentStatus === option.value ? "primary" : "secondary"}
            />
          ))}
        </View>

        <AppInput label="ملاحظات" value={notes} onChangeText={setNotes} multiline placeholder="اختياري" />
        <AppInput
          label="الموقع (اختياري)"
          value={locationAddress}
          onChangeText={setLocationAddress}
          placeholder="اسم المنطقة أو العنوان"
        />
        <AppButton
          label={submitting ? "جاري الحفظ..." : "حفظ التوزيع"}
          onPress={onSubmit}
          disabled={submitting || !merchantName.trim() || !quantity.trim()}
        />
      </Card>
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
    textAlign: "right",
    lineHeight: 22,
  },
  suggestionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  suggestions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestion: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#99f6e4",
    borderRadius: 12,
  },
  suggestionText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
});
