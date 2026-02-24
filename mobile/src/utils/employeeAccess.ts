import { Alert } from "react-native";
import { getApiErrorMeta, parseApiError } from "@/src/services/api";
import { openDialer } from "@/src/utils/contact";

interface HandleAccessErrorOptions {
  onSessionRevoked?: () => void;
}

export function handleEmployeeAccessError(
  error: unknown,
  options: HandleAccessErrorOptions = {}
): boolean {
  const meta = getApiErrorMeta(error);

  if (meta.code === "EMPLOYEE_SUSPENDED") {
    const adminPhone =
      typeof meta.details?.adminPhone === "string" ? String(meta.details.adminPhone) : "";

    Alert.alert("إيقاف مؤقت", parseApiError(error), [
      ...(adminPhone
        ? [
            {
              text: "اتصال",
              onPress: () => {
                openDialer(adminPhone).catch(() => undefined);
              },
            },
          ]
        : []),
      { text: "إغلاق", style: "cancel" },
    ]);
    return true;
  }

  if (meta.code === "EMPLOYEE_SESSION_REVOKED") {
    Alert.alert("تم إنهاء الجلسة", parseApiError(error), [
      {
        text: "موافق",
        onPress: () => {
          options.onSessionRevoked?.();
        },
      },
    ]);
    return true;
  }

  return false;
}
