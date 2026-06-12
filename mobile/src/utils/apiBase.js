import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PORT = 8080;

const normalizeUrl = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
};

const extractHost = (value) => {
  if (!value) return null;
  const match = String(value).match(/^(?:[a-z]+:\/\/)?([^/:?#]+)(?::\d+)?/i);
  return match?.[1] || null;
};

const getMetroHostUrl = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    null;
  const host = extractHost(hostUri);
  if (!host) return null;
  return `http://${host}:${DEFAULT_PORT}`;
};

export const getApiBaseUrl = () => {
  const envUrl =
    normalizeUrl(process.env.EXPO_PUBLIC_API_URL) ||
    normalizeUrl(process.env.EXPO_PUBLIC_BACKEND_URL);

  if (envUrl) return envUrl;

  if (__DEV__) {
    const metroHostUrl = getMetroHostUrl();
    if (metroHostUrl) return metroHostUrl;
    if (Platform.OS === 'android' && !Constants.isDevice) return 'http://10.0.2.2:8080';
    if (Platform.OS === 'ios' && !Constants.isDevice) return 'http://localhost:8080';
    return Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
  }

  return getMetroHostUrl() || 'http://localhost:8080';
};

export const getNetworkErrorMessage = (baseUrl) =>
  `Unable to reach the backend at ${baseUrl}. If you're on a phone, set EXPO_PUBLIC_API_URL to your computer's LAN IP, like http://192.168.1.10:8080`;
