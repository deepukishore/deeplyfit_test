import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../utils/ads';

const BannerAdComponent = ({ style }) => {
  const [adLoaded, setAdLoaded] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('✅ Banner ad loaded');
          setAdLoaded(true);
        }}
        onAdFailedToLoad={(error) => {
          console.log('❌ Banner ad failed:', error);
          setAdLoaded(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'transparent',
  },
});

export default BannerAdComponent;