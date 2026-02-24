import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "@/src/config/network";
import { ApiErrorResponse } from "@/src/types/models";

const client = axios.create({
  timeout: 20000,
});

let authToken: string | null = null;

const MESSAGE_TRANSLATIONS: Record<string, string> = {
  Unauthorized: "غير مصرح. يرجى تسجيل الدخول من جديد.",
  "Network Error": "تعذر الاتصال بالخادم. تأكد من رابط الخادم والاتصال بالشبكة.",
  "Admin not found": "لم يتم العثور على حساب الأدمن.",
  "Employee not found": "لم يتم العثور على الموظف.",
  "Invalid employeeId": "معرف الموظف غير صالح.",
  "Invalid merchantId": "معرف التاجر غير صالح.",
  "Merchant not found": "لم يتم العثور على التاجر.",
  "Merchant name is required": "اسم التاجر مطلوب.",
  "name, phone and car are required": "الاسم ورقم الجوال والسيارة مطلوبة.",
  "price must be a positive number": "السعر يجب أن يكون رقمًا موجبًا.",
  "quantity must be a positive number": "الكمية يجب أن تكون رقمًا موجبًا.",
  "isActive must be a boolean": "قيمة حالة التفعيل غير صحيحة.",
  "Employee is inactive": "الموظف موقوف حاليًا.",
  "Distributed quantity cannot exceed current stock": "لا يمكن توزيع كمية أكبر من الرصيد الحالي.",
  "merchantName is required when merchantId is not provided":
    "اسم التاجر مطلوب عند عدم تحديد معرف التاجر.",
  "Cannot delete employee with recorded operations. Deactivate instead.":
    "لا يمكن حذف موظف لديه عمليات مسجلة، ويمكنك إيقافه بدلًا من ذلك.",
  "WhatsApp integration is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.":
    "تكامل واتساب غير مفعّل على الخادم.",
  "Your account has been removed by admin. Session revoked.":
    "تم حذف حسابك من النظام من قبل الأدمن. تم تسجيل خروجك.",
};

function translateApiMessage(message: string): string {
  const normalized = message.trim();
  if (MESSAGE_TRANSLATIONS[normalized]) {
    return MESSAGE_TRANSLATIONS[normalized];
  }

  const lower = normalized.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("exceeded")) {
    return "انتهت مهلة الاتصال بالخادم. حاول مرة أخرى.";
  }

  if (
    lower.includes("network error") ||
    lower.includes("failed to fetch") ||
    lower.includes("load failed")
  ) {
    return "تعذر الاتصال بالخادم. تحقق من الإنترنت ورابط الخادم.";
  }

  return normalized;
}

export interface ApiErrorMeta {
  message: string;
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

export function getApiErrorMeta(error: unknown): ApiErrorMeta {
  if (!error) {
    return {
      message: "حدث خطأ غير متوقع",
    };
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;
  const responseData = axiosError.response?.data;

  if (responseData?.message) {
    return {
      message: responseData.message,
      statusCode: axiosError.response?.status,
      code: responseData.code,
      details: responseData.details,
    };
  }

  if (axiosError.message) {
    return {
      message: axiosError.message,
      statusCode: axiosError.response?.status,
    };
  }

  return {
    message: "فشل تنفيذ الطلب. حاول مرة أخرى",
  };
}

export function setApiToken(token: string | null): void {
  authToken = token;
}

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const baseURL = await getApiBaseUrl();
  config.baseURL = baseURL;

  if (authToken) {
    if (typeof config.headers?.set === "function") {
      config.headers.set("Authorization", `Bearer ${authToken}`);
    } else {
      // Fallback for non-AxiosHeaders runtimes.
      (config.headers as Record<string, string>).Authorization = `Bearer ${authToken}`;
    }
  }

  return config;
});

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await client.request<T>(config);
  return response.data;
}

export function parseApiError(error: unknown): string {
  const meta = getApiErrorMeta(error);
  return translateApiMessage(meta.message);
}
