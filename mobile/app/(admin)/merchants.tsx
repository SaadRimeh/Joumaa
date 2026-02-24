import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
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
import { adminApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { MerchantItem } from "@/src/types/models";
import { openDialer } from "@/src/utils/contact";
import { formatDateTime, formatNumber } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

export default function AdminMerchantsScreen() {
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getMerchants(search);
      setMerchants(data);
    } catch (error) {
      Alert.alert("خطأ", parseApiError(error));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const stats = useMemo(() => {
    const withPhone = merchants.filter((item) => Boolean(item.phone?.trim())).length;
    const totalReceived = merchants.reduce((sum, item) => sum + Number(item.totalReceived || 0), 0);
    return {
      count: merchants.length,
      withPhone,
      totalReceived,
    };
  }, [merchants]);

  const onCreate = async () => {
    try {
      setSaving(true);
      await adminApi.createMerchant({
        name: name.trim(),
        phone: phone.trim(),
        shopName: shopName.trim(),
      });
      setName("");
      setPhone("");
      setShopName("");
      await load();
    } catch (error) {
      Alert.alert("خطأ", parseApiError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen
      title="قاعدة بيانات التجار"
      subtitle="إضافة ومتابعة التجار"
      rightAction={<AppButton label="رجوع" onPress={() => router.back()} variant="secondary" />}
    >
      <Card>
        <SectionTitle title="ملخص سريع" />
        <View style={styles.statsRow}>
          <InfoRow label="عدد التجار" value={formatNumber(stats.count)} />
          <InfoRow label="مع أرقام اتصال" value={formatNumber(stats.withPhone)} />
          <InfoRow label="إجمالي الاستلام" value={`${formatNumber(stats.totalReceived)} كغ`} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="إضافة تاجر جديد" />
        <AppInput label="اسم التاجر" value={name} onChangeText={setName} placeholder="إلزامي" />
        <AppInput
          label="رقم الجوال"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="اختياري"
        />
        <AppInput
          label="اسم المحل"
          value={shopName}
          onChangeText={setShopName}
          placeholder="اختياري"
        />
        <AppButton
          label={saving ? "جاري الحفظ..." : "إضافة"}
          onPress={onCreate}
          disabled={saving || !name.trim()}
        />
      </Card>

      <Card>
        <SectionTitle title="التجار" subtitle={`العدد: ${merchants.length}`} />
        <AppInput
          label="بحث"
          value={search}
          onChangeText={setSearch}
          placeholder="اسم التاجر أو المحل"
        />
        <AppButton label="بحث" onPress={load} variant="secondary" />
        {loading ? <LoadingState /> : null}
        {!loading && merchants.length === 0 ? <EmptyState title="لا يوجد تجار" /> : null}
        {merchants.map((item) => (
          <Pressable key={item._id} style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <InfoRow label="رقم الجوال" value={item.phone || "-"} />
            <InfoRow label="المحل" value={item.shopName || "-"} />
            <InfoRow label="إجمالي الاستلام" value={`${formatNumber(item.totalReceived)} كغ`} />
            <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
            {item.phone ? (
              <AppButton
                label="اتصال بالتاجر"
                variant="secondary"
                onPress={() => {
                  openDialer(item.phone).catch(() => undefined);
                }}
              />
            ) : null}
          </Pressable>
        ))}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    gap: 4,
  },
  item: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff",
    gap: 4,
  },
  name: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
    textAlign: "right",
  },
  time: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "right",
  },
});
