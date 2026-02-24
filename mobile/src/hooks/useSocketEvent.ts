import { useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";

type EventHandler<T> = (payload: T) => void;

export function useSocketEvent<T = unknown>(eventName: string, handler: EventHandler<T>) {
  const { socket } = useAuth();

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.on(eventName, handler);
    return () => {
      socket.off(eventName, handler);
    };
  }, [eventName, handler, socket]);
}
