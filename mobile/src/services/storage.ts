import AsyncStorage from "@react-native-async-storage/async-storage";
import { AdminProfile, EmployeeProfile, UserRole } from "@/src/types/models";

const SESSION_KEY = "joumaa_session";

export interface StoredSession {
  token: string;
  role: UserRole;
  admin?: AdminProfile;
  employee?: EmployeeProfile;
}

export async function saveSession(session: StoredSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getSession(): Promise<StoredSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
