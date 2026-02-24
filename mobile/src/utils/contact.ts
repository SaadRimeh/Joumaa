import * as Linking from "expo-linking";

function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").trim();
}

export function normalizeWhatsAppPhone(phone: string): string {
  const sanitized = sanitizePhone(phone);
  if (!sanitized) {
    return "";
  }

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

export async function openDialer(phone: string): Promise<void> {
  const sanitized = sanitizePhone(phone);
  if (!sanitized) {
    throw new Error("رقم الهاتف غير صالح");
  }

  const dialUrl = `tel:${sanitized}`;
  const canOpen = await Linking.canOpenURL(dialUrl);
  if (!canOpen) {
    throw new Error("تعذر فتح تطبيق الاتصال");
  }

  await Linking.openURL(dialUrl);
}

export async function openWhatsAppChat(phone: string, text: string): Promise<void> {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) {
    throw new Error("تعذر تجهيز رقم واتساب");
  }

  const encodedText = encodeURIComponent(text);
  const appUrl = `whatsapp://send?phone=${normalized}&text=${encodedText}`;
  const webUrl = `https://wa.me/${normalized}?text=${encodedText}`;

  const canOpenApp = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpenApp ? appUrl : webUrl);
}
