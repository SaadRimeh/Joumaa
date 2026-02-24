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
import { useAdminNotifications } from "@/src/context/AdminNotificationsContext";
import { adminApi } from "@/src/services/endpoints";
import { parseApiError } from "@/src/services/api";
import { EmployeeListItem } from "@/src/types/models";
import { openDialer } from "@/src/utils/contact";
import { formatDateTime, formatNumber } from "@/src/utils/format";
import { colors } from "@/src/theme/colors";

export default function AdminEmployeesScreen() {
  const { pushNotification } = useAdminNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCar, setNewCar] = useState("");
  const [saving, setSaving] = useState(false);

  const loadEmployees = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const data = await adminApi.getEmployees(search);
        setEmployees(data);
      } catch (error) {
        Alert.alert("خطأ", parseApiError(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useFocusEffect(
    useCallback(() => {
      loadEmployees();
    }, [loadEmployees])
  );

  const totalStock = useMemo(
    () => employees.reduce((sum, employee) => sum + employee.currentStock, 0),
    [employees]
  );

  const onCreate = async () => {
    try {
      setSaving(true);
      const created = await adminApi.createEmployee({
        name: newName.trim(),
        phone: newPhone.trim(),
        car: newCar.trim(),
      });
      pushNotification({
        type: "system",
        title: "إضافة موظف جديد",
        message: `تمت إضافة ${created.name} بنجاح. الكود: ${created.uniqueCode}`,
        vibrate: false,
      });
      setNewName("");
      setNewPhone("");
      setNewCar("");
      await loadEmployees(true);
    } catch (error) {
      Alert.alert("فشل الإضافة", parseApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const onToggleStatus = async (item: EmployeeListItem) => {
    try {
      await adminApi.updateEmployeeStatus(item._id, !item.isActive);
      pushNotification({
        type: "system",
        title: "تحديث حالة موظف",
        message: `${item.name} أصبح ${item.isActive ? "موقوفًا" : "نشطًا"}.`,
        vibrate: false,
      });
      await loadEmployees(true);
    } catch (error) {
      Alert.alert("خطأ", parseApiError(error));
    }
  };

  const handleDeleteEmployee = async (item: EmployeeListItem) => {
    try {
      await adminApi.deleteEmployee(item._id);
      pushNotification({
        type: "system",
        title: "حذف موظف",
        message: `تم حذف الموظف ${item.name} من النظام.`,
      });
      await loadEmployees(true);
    } catch (error) {
      Alert.alert("فشل الحذف", parseApiError(error));
    }
  };

  const onDeleteEmployee = (item: EmployeeListItem) => {
    Alert.alert(
      "تأكيد حذف الموظف",
      `هل تريد حذف الموظف ${item.name}؟\nلا يمكن التراجع عن هذا الإجراء.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            handleDeleteEmployee(item);
          },
        },
      ]
    );
  };

  return (
    <AppScreen title="إدارة الموظفين" subtitle="إضافة ومتابعة الموزعين">
      <Card>
        <SectionTitle title="إحصائيات سريعة" />
        <InfoRow label="عدد الموظفين" value={formatNumber(employees.length)} />
        <InfoRow
          label="الموظفون النشطون"
          value={formatNumber(employees.filter((employee) => employee.isActive).length)}
        />
        <InfoRow label="إجمالي الرصيد الحالي" value={`${formatNumber(totalStock)} كغ`} />
      </Card>

      <Card>
        <SectionTitle title="إضافة موظف جديد" />
        <AppInput label="الاسم" value={newName} onChangeText={setNewName} placeholder="اسم الموظف" />
        <AppInput
          label="رقم الجوال"
          value={newPhone}
          onChangeText={setNewPhone}
          keyboardType="phone-pad"
          placeholder="09xxxxxxxx"
        />
        <AppInput
          label="السيارة"
          value={newCar}
          onChangeText={setNewCar}
          placeholder="نوع السيارة / رقمها"
        />
        <AppButton
          label={saving ? "جاري الحفظ..." : "إضافة موظف"}
          onPress={onCreate}
          disabled={saving || !newName.trim() || !newPhone.trim() || !newCar.trim()}
        />
      </Card>

      <Card>
        <SectionTitle
          title="قائمة الموظفين"
          right={
            <AppButton
              label={refreshing ? "..." : "تحديث"}
              onPress={() => loadEmployees(true)}
              variant="secondary"
            />
          }
        />
        <AppInput label="بحث" value={search} onChangeText={setSearch} placeholder="بالاسم أو الرقم أو الكود" />
        <AppButton label="تنفيذ البحث" onPress={() => loadEmployees(true)} variant="secondary" />

        {loading ? <LoadingState /> : null}

        {!loading && employees.length === 0 ? (
          <EmptyState title="لا يوجد موظفون" subtitle="أضف موظفًا جديدًا للبدء" />
        ) : null}

        {employees.map((item) => (
          <Pressable
            key={item._id}
            style={styles.employeeItem}
            onPress={() => router.push(`/(admin)/employee/${item._id}`)}
          >
            <View style={styles.headRow}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[styles.status, { color: item.isActive ? colors.success : colors.danger }]}>
                {item.isActive ? "نشط" : "موقوف"}
              </Text>
            </View>
            <InfoRow label="الهاتف" value={item.phone} />
            <InfoRow label="السيارة" value={item.car} />
            <InfoRow label="الكود" value={item.uniqueCode} />
            <InfoRow label="الرصيد الحالي" value={`${formatNumber(item.currentStock)} كغ`} />
            <InfoRow label="إجمالي المستلم" value={`${formatNumber(item.totalReceived)} كغ`} />
            <InfoRow label="إجمالي الموزع" value={`${formatNumber(item.totalDistributed)} كغ`} />
            <InfoRow label="الإنشاء" value={formatDateTime(item.createdAt)} />
            <View style={styles.actions}>
              <AppButton
                label="عرض التفاصيل"
                onPress={() => router.push(`/(admin)/employee/${item._id}`)}
                variant="secondary"
              />
              <AppButton
                label="اتصال"
                onPress={() => {
                  openDialer(item.phone).catch(() => undefined);
                }}
                variant="secondary"
              />
              <AppButton
                label={item.isActive ? "إيقاف" : "تفعيل"}
                onPress={() => onToggleStatus(item)}
                variant={item.isActive ? "danger" : "primary"}
              />
              <AppButton label="حذف" onPress={() => onDeleteEmployee(item)} variant="danger" />
            </View>
          </Pressable>
        ))}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  employeeItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 11,
    backgroundColor: "#fafafa",
    gap: 4,
  },
  headRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  status: {
    fontSize: 13,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
});
