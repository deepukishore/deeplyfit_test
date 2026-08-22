import { TestIds } from 'react-native-google-mobile-ads';

// Use test IDs in development
// Use real IDs in production build
const IS_TESTING = __DEV__;

export const AD_UNIT_IDS = {
  banner: IS_TESTING
    ? TestIds.BANNER
    : 'ca-app-pub-8055905329359163/9061259452',

  rewarded: IS_TESTING
    ? TestIds.REWARDED
    : 'ca-app-pub-8055905329359163/3859913982',
};

export const ADMOB_APP_ID = 'ca-app-pub-8055905329359163~3070566170';