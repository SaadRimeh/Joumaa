import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { extractSocketBaseUrl, getApiBaseUrl, saveApiBaseUrl } from "@/src/config/network";
import { authApi } from "@/src/services/endpoints";
import { setApiToken } from "@/src/services/api";
import { clearSession, getSession, saveSession } from "@/src/services/storage";
import { AdminProfile, EmployeeProfile, UserRole } from "@/src/types/models";

type AuthUser = AdminProfile | EmployeeProfile | null;

interface AuthContextValue {
  loading: boolean;
  token: string | null;
  role: UserRole | null;
  user: AuthUser;
  apiBaseUrl: string;
  socket: Socket | null;
  loginAdmin: (phone: string, password: string) => Promise<void>;
  loginEmployee: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateApiBaseUrl: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapMeResponse(role: UserRole, rawUser: unknown): AuthUser {
  if (role === "admin") {
    const user = rawUser as AdminProfile;
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      currentKiloPrice: user.currentKiloPrice,
      createdAt: user.createdAt,
    };
  }

  const user = rawUser as EmployeeProfile;
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    car: user.car,
    uniqueCode: user.uniqueCode,
    currentStock: user.currentStock,
    totalReceived: user.totalReceived,
    totalDistributed: user.totalDistributed,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<AuthUser>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
  }, []);

  const connectSocket = useCallback((nextToken: string, currentApiBaseUrl: string) => {
    disconnectSocket();
    const socketUrl = extractSocketBaseUrl(currentApiBaseUrl);
    const client = io(socketUrl, {
      transports: ["websocket"],
      auth: { token: nextToken },
    });
    socketRef.current = client;
    setSocket(client);
  }, [disconnectSocket]);

  const persistSession = useCallback(
    async (nextToken: string, nextRole: UserRole, nextUser: AuthUser) => {
      if (nextRole === "admin") {
        await saveSession({
          token: nextToken,
          role: nextRole,
          admin: nextUser as AdminProfile,
        });
      } else {
        await saveSession({
          token: nextToken,
          role: nextRole,
          employee: nextUser as EmployeeProfile,
        });
      }
    },
    []
  );

  const hydrate = useCallback(async () => {
    setLoading(true);
    const [storedSession, currentApiBaseUrl] = await Promise.all([getSession(), getApiBaseUrl()]);
    setApiBaseUrl(currentApiBaseUrl);

    if (!storedSession) {
      setLoading(false);
      return;
    }

    setToken(storedSession.token);
    setRole(storedSession.role);
    setUser(storedSession.role === "admin" ? storedSession.admin || null : storedSession.employee || null);
    setApiToken(storedSession.token);
    connectSocket(storedSession.token, currentApiBaseUrl);

    try {
      const me = await authApi.me();
      const mappedUser = mapMeResponse(me.data.role, me.data.user);
      setRole(me.data.role);
      setUser(mappedUser);
      await persistSession(storedSession.token, me.data.role, mappedUser);
    } catch {
      setToken(null);
      setRole(null);
      setUser(null);
      setApiToken(null);
      disconnectSocket();
      await clearSession();
    } finally {
      setLoading(false);
    }
  }, [connectSocket, disconnectSocket, persistSession]);

  useEffect(() => {
    hydrate();
    return () => {
      disconnectSocket();
    };
  }, [hydrate, disconnectSocket]);

  const loginAdmin = useCallback(
    async (phone: string, password: string) => {
      const payload = { phone: phone.trim(), password: password.trim() };
      const response = await authApi.loginAdmin(payload);
      const nextUser = response.admin || null;

      setToken(response.token);
      setRole("admin");
      setUser(nextUser);
      setApiToken(response.token);
      connectSocket(response.token, apiBaseUrl || (await getApiBaseUrl()));
      await persistSession(response.token, "admin", nextUser);
    },
    [apiBaseUrl, connectSocket, persistSession]
  );

  const loginEmployee = useCallback(
    async (code: string) => {
      const response = await authApi.loginEmployee({ code: code.trim() });
      const nextUser = response.employee || null;

      setToken(response.token);
      setRole("employee");
      setUser(nextUser);
      setApiToken(response.token);
      connectSocket(response.token, apiBaseUrl || (await getApiBaseUrl()));
      await persistSession(response.token, "employee", nextUser);
    },
    [apiBaseUrl, connectSocket, persistSession]
  );

  const logout = useCallback(async () => {
    setToken(null);
    setRole(null);
    setUser(null);
    setApiToken(null);
    disconnectSocket();
    await clearSession();
  }, [disconnectSocket]);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      return;
    }

    const me = await authApi.me();
    const mappedUser = mapMeResponse(me.data.role, me.data.user);
    setRole(me.data.role);
    setUser(mappedUser);
    await persistSession(token, me.data.role, mappedUser);
  }, [persistSession, token]);

  const updateApiBaseUrl = useCallback(
    async (url: string) => {
      const normalized = await saveApiBaseUrl(url);
      setApiBaseUrl(normalized);

      if (token) {
        connectSocket(token, normalized);
      }
    },
    [connectSocket, token]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      token,
      role,
      user,
      apiBaseUrl,
      socket,
      loginAdmin,
      loginEmployee,
      logout,
      refreshProfile,
      updateApiBaseUrl,
    }),
    [
      loading,
      token,
      role,
      user,
      apiBaseUrl,
      socket,
      loginAdmin,
      loginEmployee,
      logout,
      refreshProfile,
      updateApiBaseUrl,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
