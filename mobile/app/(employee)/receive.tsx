import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { AppButton, AppInput, AppScreen, Card, InfoRow, SectionTitle } from "@/src/components/ui";
import { employeeApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { handleEmployeeAccessError } from "@/src/utils/employeeAccess";
import { formatDateTime, formatNumber } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

export default function EmployeeReceiveScreen() {
  const { logout } = useAuth();
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastRecord, setLastRecord] = useState<{
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    createdAt: string;
  } | null>(null);

  const onSubmit = async () => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert("تنبيه", "الكمية يجب أن تكون رقمًا موجبًا");
      return;
    }

    try {
      setSubmitting(true);
      const result = await employeeApi.createReceiving({
        quantity: qty,
        notes: notes.trim() || undefined,
      });
      setLastRecord({
        quantity: result.receiving.quantity,
        stockBefore: result.receiving.stockBefore,
        stockAfter: result.receiving.stockAfter,
        createdAt: result.receiving.createdAt,
      });
      setQuantity("");
      setNotes("");
      Alert.alert("تمت العملية", "تم تسجيل الاستلام وتحديث الرصيد");
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
    <AppScreen
      title="استلام من المدجنة"
      subtitle="تحديث رصيد الموظف عند الاستلام"
      rightAction={<AppButton label="رجوع" onPress={() => router.back()} variant="secondary" />}
    >
      <Card>
        <SectionTitle title="استلام دجاج جديد" />
        <AppInput
          label="الكمية المستلمة (كغ)"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="مثال: 500"
        />
        <AppInput label="ملاحظات" value={notes} onChangeText={setNotes} multiline placeholder="اختياري" />
        <AppButton
          label={submitting ? "جاري الحفظ..." : "تأكيد الاستلام"}
          onPress={onSubmit}
          disabled={submitting || !quantity.trim()}
        />
      </Card>

      {lastRecord ? (
        <Card>
          <SectionTitle title="آخر عملية استلام" />
          <InfoRow label="التاريخ" value={formatDateTime(lastRecord.createdAt)} />
          <InfoRow label="الكمية المستلمة" value={`${formatNumber(lastRecord.quantity)} كغ`} />
          <InfoRow label="الرصيد قبل الاستلام" value={`${formatNumber(lastRecord.stockBefore)} كغ`} />
          <InfoRow label="الرصيد بعد الاستلام" value={`${formatNumber(lastRecord.stockAfter)} كغ`} />
          <Text style={styles.note}>تم تحديث الرصيد بشكل فوري في لوحة الأدمن والموظف.</Text>
        </Card>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
  },
});
