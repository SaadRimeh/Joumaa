import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import { Vibration } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { DistributionItem, ReceivingItem } from "@/src/types/models";
import { formatNumber } from "@/src/utils/format";

type NotificationType = "distribution" | "receiving" | "stock-low" | "price" | "system";

export interface AdminNotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface PushNotificationPayload {
  type?: NotificationType;
  title: string;
  message: string;
  vibrate?: boolean;
}

interface AdminNotificationsContextValue {
  notifications: AdminNotificationItem[];
  unreadCount: number;
  pushNotification: (payload: PushNotificationPayload) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const MAX_NOTIFICATIONS = 200;

const AdminNotificationsContext = createContext<AdminNotificationsContextValue | undefined>(
  undefined
);

function createNotificationItem(payload: PushNotificationPayload): AdminNotificationItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: payload.type || "system",
    title: payload.title,
    message: payload.message,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

function resolveEmployeeName(
  employee: DistributionItem["employeeId"] | ReceivingItem["employeeId"]
): string {
  if (!employee || typeof employee === "string") {
    return "موظف";
  }
  return employee.name || "موظف";
}

export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { role, socket } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);

  const pushNotification = useCallback((payload: PushNotificationPayload) => {
    const item = createNotificationItem(payload);
    setNotifications((prev) => [item, ...prev].slice(0, MAX_NOTIFICATIONS));

    const shouldVibrate = payload.vibrate !== false;
    if (shouldVibrate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      Vibration.vibrate(80);
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (role !== "admin") {
      setNotifications([]);
      return;
    }

    if (!socket) {
      return;
    }

    const onDistributionNew = (payload: DistributionItem) => {
      const employeeName = resolveEmployeeName(payload.employeeId);
      pushNotification({
        type: "distribution",
        title: "عملية توزيع جديدة",
        message: `${employeeName} وزع ${formatNumber(payload.quantity)} كغ إلى ${payload.merchantName}`,
      });
    };

    const onReceivingNew = (payload: ReceivingItem) => {
      const employeeName = resolveEmployeeName(payload.employeeId);
      pushNotification({
        type: "receiving",
        title: "استلام جديد من المدجنة",
        message: `${employeeName} استلم ${formatNumber(payload.quantity)} كغ (قبل ${formatNumber(
          payload.stockBefore
        )} - بعد ${formatNumber(payload.stockAfter)})`,
      });
    };

    const onStockLow = (payload: { employeeId?: string; currentStock?: number }) => {
      const stock = Number(payload?.currentStock || 0);
      pushNotification({
        type: "stock-low",
        title: "تنبيه مخزون منخفض",
        message: `مخزون موظف وصل إلى ${formatNumber(stock)} كغ`,
      });
    };

    const onPriceUpdated = (payload: { oldPrice?: number; newPrice?: number }) => {
      pushNotification({
        type: "price",
        title: "تحديث سعر الكيلو",
        message: `تم تعديل السعر من ${formatNumber(payload.oldPrice || 0)} إلى ${formatNumber(
          payload.newPrice || 0
        )} ل.س`,
        vibrate: false,
      });
    };

    socket.on("distribution:new", onDistributionNew);
    socket.on("receiving:new", onReceivingNew);
    socket.on("stock:low", onStockLow);
    socket.on("price:updated", onPriceUpdated);

    return () => {
      socket.off("distribution:new", onDistributionNew);
      socket.off("receiving:new", onReceivingNew);
      socket.off("stock:low", onStockLow);
      socket.off("price:updated", onPriceUpdated);
    };
  }, [pushNotification, role, socket]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const value = useMemo<AdminNotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      pushNotification,
      markAllAsRead,
      clearNotifications,
    }),
    [clearNotifications, markAllAsRead, notifications, pushNotification, unreadCount]
  );

  return (
    <AdminNotificationsContext.Provider value={value}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}

export function useAdminNotifications(): AdminNotificationsContextValue {
  const context = useContext(AdminNotificationsContext);
  if (!context) {
    throw new Error("useAdminNotifications must be used within AdminNotificationsProvider");
  }
  return context;
}
