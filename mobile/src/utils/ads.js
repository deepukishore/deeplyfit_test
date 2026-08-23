import mobileAds, { TestIds } from 'react-native-google-mobile-ads';

const USE_TEST_ADS = __DEV__ || process.env.EXPO_PUBLIC_USE_TEST_ADS === 'true';

let initializationPromise = null;

export const initializeMobileAds = () => {
  if (!initializationPromise) {
    initializationPromise = mobileAds().initialize().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }
  return initializationPromise;
};

export const AD_UNIT_IDS = {
  banner: USE_TEST_ADS
    ? TestIds.ADAPTIVE_BANNER
    : 'ca-app-pub-8055905329359163/9061259452',

  rewarded: USE_TEST_ADS
    ? TestIds.REWARDED
    : 'ca-app-pub-8055905329359163/3859913982',
};

export const USING_TEST_ADS = USE_TEST_ADS;
export const ADMOB_APP_ID = 'ca-app-pub-8055905329359163~3070566170';
