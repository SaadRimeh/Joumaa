import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { AppButton, AppInput, AppScreen, Card, EmptyState, InfoRow, LoadingState, SectionTitle } from "@/src/components/ui";
import { useAdminNotifications } from "@/src/context/AdminNotificationsContext";
import { useAuth } from "@/src/context/AuthContext";
import { adminApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { PriceHistoryItem } from "@/src/types/models";
import { formatCurrency, formatDateTime } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

export default function AdminSettingsScreen() {
  const { apiBaseUrl, updateApiBaseUrl, logout } = useAuth();
  const { pushNotification } = useAdminNotifications();
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState(0);
  const [priceInput, setPriceInput] = useState("");
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [newApiUrl, setNewApiUrl] = useState(apiBaseUrl);
  const [savingUrl, setSavingUrl] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [priceData, historyData] = await Promise.all([
        adminApi.getPriceSettings(),
        adminApi.getPriceHistory(20),
      ]);
      setPrice(priceData.currentKiloPrice);
      setPriceInput(String(priceData.currentKiloPrice || ""));
      setHistory(historyData);
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

  const onUpdatePrice = async () => {
    const numericPrice = Number(priceInput);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      Alert.alert("تنبيه", "أدخل سعراً صحيحاً أكبر من 0");
      return;
    }
    try {
      setUpdatingPrice(true);
      const result = await adminApi.updatePrice(numericPrice);
      setPrice(result.newPrice);
      pushNotification({
        type: "price",
        title: "تحديث سعر الكيلو",
        message: `تم تعديل السعر من ${result.oldPrice} إلى ${result.newPrice} ل.س`,
        vibrate: false,
      });
      await load();
    } catch (error) {
      Alert.alert("فشل التحديث", parseApiError(error));
    } finally {
      setUpdatingPrice(false);
    }
  };

  const onSaveApiUrl = async () => {
    try {
      setSavingUrl(true);
      await updateApiBaseUrl(newApiUrl);
      pushNotification({
        type: "system",
        title: "تحديث رابط الخادم",
        message: "تم حفظ رابط الخادم بنجاح.",
        vibrate: false,
      });
    } catch (error) {
      Alert.alert("خطأ", parseApiError(error));
    } finally {
      setSavingUrl(false);
    }
  };

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <AppScreen title="الإعدادات" subtitle="السعر - الاتصال - إدارة الجلسة">
      {loading ? <LoadingState /> : null}

      <Card>
        <SectionTitle title="إدارة سعر الكيلو" />
        <InfoRow label="السعر الحالي" value={formatCurrency(price)} valueStyle={{ color: colors.accent }} />
        <AppInput
          label="سعر جديد"
          value={priceInput}
          onChangeText={setPriceInput}
          keyboardType="numeric"
          placeholder="أدخل السعر بالليرة السورية"
        />
        <AppButton label={updatingPrice ? "جاري التحديث..." : "تحديث السعر"} onPress={onUpdatePrice} disabled={updatingPrice} />
      </Card>

      <Card>
        <SectionTitle title="تاريخ تغييرات السعر" />
        {history.length === 0 ? <EmptyState title="لا يوجد سجل تغييرات" /> : null}
        {history.map((item) => (
          <View key={item._id} style={styles.historyItem}>
            <InfoRow label="السعر السابق" value={formatCurrency(item.oldPrice)} />
            <InfoRow label="السعر الجديد" value={formatCurrency(item.newPrice)} />
            <InfoRow label="المسؤول" value={item.changedBy?.name || "الأدمن"} />
            <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle title="رابط الخادم" />
        <Text style={styles.help}>
          إذا كنت على هاتف حقيقي ضع عنوان IP للكمبيوتر المحلي بدلاً من localhost.
        </Text>
        <AppInput label="الرابط" value={newApiUrl} onChangeText={setNewApiUrl} placeholder="http://192.168.1.10:5000/api" />
        <AppButton
          label={savingUrl ? "جاري الحفظ..." : "حفظ الرابط"}
          onPress={onSaveApiUrl}
          disabled={savingUrl || !newApiUrl.trim()}
          variant="secondary"
        />
      </Card>

      <Card>
        <SectionTitle title="الجلسة" />
        <AppButton label="تسجيل الخروج" onPress={onLogout} variant="danger" />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  historyItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    gap: 4,
    backgroundColor: "#fff",
  },
  time: {
    color: colors.muted,
    textAlign: "right",
    fontSize: 12,
  },
  help: {
    color: colors.muted,
    textAlign: "right",
    fontSize: 13,
    lineHeight: 20,
  },
});
