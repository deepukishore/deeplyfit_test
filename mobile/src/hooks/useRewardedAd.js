import { useState, useEffect, useRef } from 'react';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../utils/ads';

const useRewardedAd = (onRewardEarned) => {
  const [loaded, setLoaded] = useState(false);
  const rewardedRef = useRef(null);

  useEffect(() => {
    loadAd();
  }, []);

  const loadAd = () => {
    const ad = RewardedAd.createForAdRequest(
      AD_UNIT_IDS.rewarded,
      {
        requestNonPersonalizedAdsOnly: false,
      }
    );

    ad.addAdEventListener(AdEventType.LOADED, () => {
      console.log('✅ Rewarded ad loaded');
      setLoaded(true);
    });

    ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('🎁 User earned reward:', reward);
        if (onRewardEarned) onRewardEarned(reward);
      }
    );

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      loadAd(); // preload next ad
    });

    ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('❌ Rewarded ad error:', error);
      setLoaded(false);
    });

    ad.load();
    rewardedRef.current = ad;
  };

  const showAd = () => {
    if (loaded && rewardedRef.current) {
      rewardedRef.current.show();
    } else {
      console.log('Ad not ready yet');
    }
  };

  return { showAd, loaded };
};

export default useRewardedAd;