import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';
import {
  SdkAvailabilityStatus,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  requestPermission,
} from 'react-native-health-connect';

import { api } from '../utils/api';


const STEP_GOAL = 10_000;
const localDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfToday = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
};

const hasStepPermission = (permissions = []) => permissions.some(
  (permission) => permission.accessType === 'read' && permission.recordType === 'Steps',
);

export const useStepCounter = (userId, dailyGoal = STEP_GOAL) => {
  const [steps, setSteps] = useState(0);
  const [status, setStatus] = useState('checking');
  const [source, setSource] = useState('not_connected');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const stepsRef = useRef(0);
  const sourceRef = useRef('not_connected');
  const subscriptionRef = useRef(null);
  const syncTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const cacheKey = `deeply_fit_steps:${userId || 'guest'}:${localDate()}`;

  const queueServerSync = useCallback((value, nextSource) => {
    if (!userId) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      api.syncSteps({ date: localDate(), steps: value, source: nextSource }).catch(() => {});
    }, 1200);
  }, [userId]);

  const publish = useCallback(async (value, nextSource, sync = true) => {
    const safeValue = Math.max(0, Math.round(Number(value) || 0));
    // Never move backwards during a day because delayed sensor callbacks and
    // network responses can arrive out of order.
    const nextValue = Math.max(stepsRef.current, safeValue);
    stepsRef.current = nextValue;
    sourceRef.current = nextSource;
    if (mountedRef.current) {
      setSteps(nextValue);
      setSource(nextSource);
      setStatus('connected');
      setError('');
    }
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ steps: nextValue, source: nextSource }));
    if (sync) queueServerSync(nextValue, nextSource);
    return nextValue;
  }, [cacheKey, queueServerSync]);

  const stopWatching = useCallback(() => {
    subscriptionRef.current?.remove?.();
    subscriptionRef.current = null;
  }, []);

  const startDevicePedometer = useCallback(async (baseline) => {
    stopWatching();
    const available = await Pedometer.isAvailableAsync();
    if (!available) return false;

    let startingTotal = Math.max(stepsRef.current, baseline || 0);
    if (Platform.OS === 'ios') {
      const historical = await Pedometer.getStepCountAsync(startOfToday(), new Date());
      startingTotal = Math.max(startingTotal, historical?.steps || 0);
    }
    await publish(startingTotal, Platform.OS === 'ios' ? 'apple_motion' : 'device_pedometer');
    subscriptionRef.current = Pedometer.watchStepCount(({ steps: sessionSteps }) => {
      publish(startingTotal + (sessionSteps || 0), Platform.OS === 'ios' ? 'apple_motion' : 'device_pedometer');
    });
    return true;
  }, [publish, stopWatching]);

  const readHealthConnect = useCallback(async () => {
    const result = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: startOfToday().toISOString(),
        endTime: new Date().toISOString(),
      },
    });
    await publish(result?.COUNT_TOTAL || 0, 'health_connect');
    return true;
  }, [publish]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (Platform.OS === 'android') {
        try {
          const sdkStatus = await getSdkStatus();
          if (sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE && await initialize()) {
            const granted = await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
            if (hasStepPermission(granted)) {
              stopWatching();
              await readHealthConnect();
              return true;
            }
            setStatus('permission_required');
            setError('Step access was not granted. You can enable it in Health Connect settings.');
            return false;
          }
        } catch (healthError) {
          // Older Android devices and Expo Go may not expose Health Connect.
          // Continue with the hardware pedometer fallback below.
        }
      }

      const permission = await Pedometer.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('permission_required');
        setError('Physical activity permission is needed to count steps.');
        return false;
      }
      const connected = await startDevicePedometer(stepsRef.current);
      if (!connected) {
        setStatus('unavailable');
        setError('A step sensor is not available on this device.');
      }
      return connected;
    } catch (connectError) {
      setStatus('error');
      setError(connectError?.message || 'Could not connect the step counter.');
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [readHealthConnect, startDevicePedometer, stopWatching]);

  const refresh = useCallback(async () => {
    if (sourceRef.current === 'health_connect') {
      try {
        await readHealthConnect();
      } catch (refreshError) {
        setError('Health Connect could not refresh. Check its app permissions.');
      }
    }
  }, [readHealthConnect]);

  const manageAccess = useCallback(() => {
    if (Platform.OS === 'android') {
      try {
        openHealthConnectSettings();
      } catch (settingsError) {
        setError('Health Connect settings are not available on this device.');
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const [cached, server] = await Promise.all([
          AsyncStorage.getItem(cacheKey),
          userId ? api.getSteps(localDate()).catch(() => null) : Promise.resolve(null),
        ]);
        const cachedValue = cached ? JSON.parse(cached) : null;
        const baseline = Math.max(cachedValue?.steps || 0, server?.steps || 0);
        stepsRef.current = baseline;
        if (!cancelled) {
          setSteps(baseline);
          setSource(server?.source || cachedValue?.source || 'not_connected');
        }

        if (Platform.OS === 'android') {
          try {
            const sdkStatus = await getSdkStatus();
            if (sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE && await initialize()) {
              const granted = await getGrantedPermissions();
              if (hasStepPermission(granted)) {
                await readHealthConnect();
                return;
              }
            }
          } catch (healthError) {
            // Try the device pedometer below.
          }
        }

        const pedometerPermission = await Pedometer.getPermissionsAsync();
        if (pedometerPermission.status === 'granted' && await startDevicePedometer(baseline)) return;
        if (!cancelled) setStatus('permission_required');
      } catch (bootstrapError) {
        if (!cancelled) {
          setStatus('error');
          setError(bootstrapError?.message || 'Could not start the step counter.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      stopWatching();
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [cacheKey, readHealthConnect, startDevicePedometer, stopWatching, userId]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refresh();
    });
    const interval = setInterval(refresh, 60_000);
    return () => {
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, [refresh]);

  const distanceKm = Number((steps * 0.00076).toFixed(1));
  const calories = Math.round(steps * 0.04);
  const goal = Math.max(500, Math.min(Math.round(Number(dailyGoal) || STEP_GOAL), 100_000));

  return {
    steps,
    goal,
    progress: Math.min((steps / goal) * 100, 100),
    distanceKm,
    calories,
    status,
    source,
    loading,
    error,
    connect,
    refresh,
    manageAccess,
    isConnected: status === 'connected',
  };
};

export default useStepCounter;
