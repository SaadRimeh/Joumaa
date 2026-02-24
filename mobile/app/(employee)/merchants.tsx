import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
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
import { MerchantAggregateItem } from "@/src/types/models";
import { openDialer } from "@/src/utils/contact";
import { handleEmployeeAccessError } from "@/src/utils/employeeAccess";
import { formatCurrency, formatDateTime, formatNumber } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

export default function EmployeeMerchantsScreen() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<MerchantAggregateItem[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await employeeApi.getMerchants(search);
      setMerchants(data);
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
  }, [logout, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert("تنبيه", "اسم التاجر إلزامي");
      return;
    }
    try {
      setSaving(true);
      await employeeApi.createMerchant({
        name: name.trim(),
        phone: phone.trim() || undefined,
        shopName: shopName.trim() || undefined,
      });
      setName("");
      setPhone("");
      setShopName("");
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
      Alert.alert("فشل الإضافة", parseApiError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen title="دليل التجار" subtitle="إضافة تاجر + سجل التعاملات">
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
          label={saving ? "جاري الإضافة..." : "إضافة"}
          onPress={onCreate}
          disabled={saving || !name.trim()}
        />
      </Card>

      <Card>
        <SectionTitle title="سجل التجار" subtitle={`النتائج: ${merchants.length}`} />
        <AppInput label="بحث" value={search} onChangeText={setSearch} placeholder="اسم التاجر" />
        <AppButton label="بحث" onPress={load} variant="secondary" />
        {loading ? <LoadingState /> : null}
        {!loading && merchants.length === 0 ? <EmptyState title="لا يوجد تجار بعد" /> : null}
        {merchants.map((item) => (
          <Pressable key={item.merchantId} style={styles.item}>
            <Text style={styles.name}>{item.merchantName}</Text>
            <InfoRow label="رقم الجوال" value={item.phone || "-"} />
            <InfoRow label="المحل" value={item.shopName || "-"} />
            <InfoRow label="إجمالي الكمية" value={`${formatNumber(item.totalQuantity)} كغ`} />
            <InfoRow label="إجمالي المبيعات" value={formatCurrency(item.totalSales)} />
            <InfoRow label="عدد العمليات" value={formatNumber(item.totalTransactions)} />
            {item.lastDistributionAt ? (
              <InfoRow label="آخر توزيع" value={formatDateTime(item.lastDistributionAt)} />
            ) : null}
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
  item: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    gap: 4,
    backgroundColor: "#fff",
  },
  name: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
    textAlign: "right",
  },
});
