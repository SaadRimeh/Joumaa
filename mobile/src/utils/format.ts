export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ar-SY").format(value || 0);
}

export function formatCurrency(value: number): string {
  return `${formatNumber(value)} ل.س`;
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("ar-SY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function paymentStatusLabel(status?: string): string {
  if (!status) {
    return "مدفوع";
  }
  if (status === "credit") {
    return "آجل";
  }
  if (status === "partial") {
    return "جزئي";
  }
  return "مدفوع";
}
