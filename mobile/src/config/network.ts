import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const API_BASE_URL_KEY = "joumaa_api_base_url";

let cachedApiBaseUrl: string | null = null;

function withProtocol(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `http://${value}`;
}

export function normalizeApiBaseUrl(input: string): string {
  const trimmed = input.trim();
  const withHttp = withProtocol(trimmed).replace(/\/+$/, "");
  if (withHttp.endsWith("/api")) {
    return withHttp;
  }
  return `${withHttp}/api`;
}

export function getDefaultApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return normalizeApiBaseUrl(fromEnv);
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  return "http://localhost:5000/api";
}

export function extractSocketBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/api\/?$/, "");
}

export async function getApiBaseUrl(): Promise<string> {
  if (cachedApiBaseUrl) {
    return cachedApiBaseUrl;
  }

  const saved = await AsyncStorage.getItem(API_BASE_URL_KEY);
  cachedApiBaseUrl = saved ? normalizeApiBaseUrl(saved) : getDefaultApiBaseUrl();
  return cachedApiBaseUrl;
}

export async function saveApiBaseUrl(value: string): Promise<string> {
  const normalized = normalizeApiBaseUrl(value);
  cachedApiBaseUrl = normalized;
  await AsyncStorage.setItem(API_BASE_URL_KEY, normalized);
  return normalized;
}
