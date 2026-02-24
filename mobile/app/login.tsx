import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppButton, AppInput, AppScreen, Card } from "@/src/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import { parseApiError } from "@/src/services/api";
import { colors } from "@/src/theme/colors";

type LoginMode = "admin" | "employee";

export default function LoginScreen() {
  const { token, role, loginAdmin, loginEmployee, apiBaseUrl, updateApiBaseUrl } = useAuth();
  const [mode, setMode] = useState<LoginMode>("admin");
  const [phone, setPhone] = useState("0940439962");
  const [password, setPassword] = useState("aziz0940439962");
  const [employeeCode, setEmployeeCode] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState(apiBaseUrl || "http://localhost:5000/api");
  const [submitting, setSubmitting] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (role === "admin") {
      router.replace("/(admin)/dashboard");
    } else {
      router.replace("/(employee)/dashboard");
    }
  }, [role, token]);

  useEffect(() => {
    setBaseUrlInput(apiBaseUrl);
  }, [apiBaseUrl]);

  const modeLabel = useMemo(() => (mode === "admin" ? "دخول الأدمن" : "دخول الموظف"), [mode]);

  const onSubmit = async () => {
    try {
      setSubmitting(true);
      if (mode === "admin") {
        await loginAdmin(phone, password);
      } else {
        await loginEmployee(employeeCode);
      }
    } catch (error) {
      Alert.alert("فشل تسجيل الدخول", parseApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onSaveApiUrl = async () => {
    try {
      setSavingUrl(true);
      await updateApiBaseUrl(baseUrlInput);
      Alert.alert("تم الحفظ", "تم تحديث رابط السيرفر بنجاح");
    } catch (error) {
      Alert.alert("خطأ", parseApiError(error));
    } finally {
      setSavingUrl(false);
    }
  };

  return (
    <AppScreen title="تسجيل الدخول" subtitle="نظام إدارة توزيع الدجاج">
      <Card>
        <View style={styles.modeRow}>
          <AppButton label="أدمن" onPress={() => setMode("admin")} variant={mode === "admin" ? "primary" : "secondary"} />
          <AppButton
            label="موظف"
            onPress={() => setMode("employee")}
            variant={mode === "employee" ? "primary" : "secondary"}
          />
        </View>
        <Text style={styles.modeTitle}>{modeLabel}</Text>

        {mode === "admin" ? (
          <>
            <AppInput
              label="رقم الأدمن"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="0940439962"
            />
            <AppInput
              label="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="ادخل كلمة المرور"
            />
          </>
        ) : (
          <AppInput
            label="كود الموظف"
            value={employeeCode}
            onChangeText={setEmployeeCode}
            keyboardType="numeric"
            placeholder="مثال: 123456"
          />
        )}

        <AppButton
          label={submitting ? "جاري الدخول..." : "دخول"}
          onPress={onSubmit}
          disabled={
            submitting ||
            (mode === "admin" ? !phone.trim() || !password.trim() : !employeeCode.trim())
          }
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>إعداد اتصال السيرفر</Text>
        <Text style={styles.helpText}>
          غيّر هذا الرابط إذا كنت تستخدم هاتفاً حقيقياً. مثال: 192.168.1.10:5000/api
        </Text>
        <AppInput label="رابط الخادم" value={baseUrlInput} onChangeText={setBaseUrlInput} placeholder="http://localhost:5000/api" />
        <AppButton
          label={savingUrl ? "جاري الحفظ..." : "حفظ الرابط"}
          onPress={onSaveApiUrl}
          disabled={savingUrl || !baseUrlInput.trim()}
          variant="secondary"
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
  },
  helpText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
  },
});
