import { useState, useEffect, useRef } from 'react';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, initializeMobileAds } from '../utils/ads';

const useRewardedAd = (onRewardEarned) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const rewardedRef = useRef(null);
  const rewardCallbackRef = useRef(onRewardEarned);

  useEffect(() => {
    rewardCallbackRef.current = onRewardEarned;
  }, [onRewardEarned]);

  useEffect(() => {
    let active = true;
    let unsubscribers = [];
    setLoaded(false);
    setError(null);

    initializeMobileAds()
      .then(() => {
        if (!active) return;
        const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded, {
          requestNonPersonalizedAdsOnly: false,
        });
        rewardedRef.current = ad;

        unsubscribers = [
          ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
            console.log('✅ Rewarded ad loaded');
            setLoaded(true);
          }),
          ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
            console.log('🎁 User earned reward:', reward);
            rewardCallbackRef.current?.(reward);
          }),
          ad.addAdEventListener(AdEventType.CLOSED, () => {
            setLoaded(false);
            setReloadToken((current) => current + 1);
          }),
          ad.addAdEventListener(AdEventType.ERROR, (adError) => {
            console.warn('Rewarded ad error:', adError);
            setLoaded(false);
            setError(adError);
          }),
        ];

        ad.load();
      })
      .catch((initializationError) => {
        if (active) setError(initializationError);
      });

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      rewardedRef.current = null;
    };
  }, [reloadToken]);

  const retry = () => setReloadToken((current) => current + 1);

  const showAd = async () => {
    if (loaded && rewardedRef.current) {
      try {
        await rewardedRef.current.show();
        return true;
      } catch (showError) {
        console.warn('Could not show rewarded ad:', showError);
        setLoaded(false);
        setError(showError);
        return false;
      }
    }
    if (error) retry();
    return false;
  };

  return { showAd, loaded, error, retry };
};

export default useRewardedAd;
