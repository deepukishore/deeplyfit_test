import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, initializeMobileAds } from '../utils/ads';

const BannerAdComponent = ({ style }) => {
  const [sdkReady, setSdkReady] = useState(false);
  const [adState, setAdState] = useState('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    initializeMobileAds()
      .then(() => {
        if (mounted) setSdkReady(true);
      })
      .catch((error) => {
        console.warn('AdMob initialization failed:', error);
        if (mounted) setAdState('failed');
      });
    return () => { mounted = false; };
  }, []);

  const retry = () => {
    setAdState('loading');
    setReloadKey((current) => current + 1);
    initializeMobileAds()
      .then(() => setSdkReady(true))
      .catch(() => setAdState('failed'));
  };

  return (
    <View style={[styles.container, style]}>
      {sdkReady && adState !== 'failed' && (
        <BannerAd
          key={reloadKey}
          unitId={AD_UNIT_IDS.banner}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('✅ Banner ad loaded');
            setAdState('loaded');
          }}
          onAdFailedToLoad={(error) => {
            console.warn('Banner ad failed:', error);
            setAdState('failed');
          }}
        />
      )}
      {adState === 'loading' && <ActivityIndicator size="small" color="#7c3aed" style={styles.loader} />}
      {adState === 'failed' && (
        <TouchableOpacity style={styles.retryButton} onPress={retry} accessibilityRole="button" accessibilityLabel="Retry loading ad">
          <Text style={styles.retryText}>Ad unavailable · Tap to retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    width: '100%',
    backgroundColor: 'transparent',
  },
  loader: { position: 'absolute' },
  retryButton: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#6b6478', fontSize: 11, fontWeight: '600' },
});

export default BannerAdComponent;
