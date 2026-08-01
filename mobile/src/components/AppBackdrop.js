import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

const AppBackdrop = ({ compact = false }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  useEffect(() => {
    let active = true;
    let loop = null;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active || reduceMotion || !isFocused) return;
      progress.setValue(0);
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: 6500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(progress, {
            toValue: 0,
            duration: 6500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
            isInteraction: false,
          }),
        ])
      );
      loop.start();
    });

    return () => {
      active = false;
      if (loop) loop.stop();
      progress.stopAnimation();
    };
  }, [isFocused, progress]);

  const driftX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const driftY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const reverseX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const reverseY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const scaleUp = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const scaleDown = progress.interpolate({ inputRange: [0, 1], outputRange: [1.04, 0.96] });
  const orbit = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '14deg'] });
  const sparkle = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.72] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[s.auroraBand, { transform: [{ translateX: driftX }, { translateY: reverseY }, { rotate: '-17deg' }] }]} />
      <Animated.View style={[s.orb, s.orbPurple, compact && s.orbCompact, { transform: [{ translateX: driftX }, { translateY: driftY }, { scale: scaleUp }] }]} />
      <Animated.View style={[s.orb, s.orbBlue, { transform: [{ translateX: reverseX }, { translateY: reverseY }, { scale: scaleDown }] }]} />
      <Animated.View style={[s.orb, s.orbAmber, { transform: [{ translateX: driftX }, { translateY: reverseY }] }]} />
      <Animated.View style={[s.ringLarge, { transform: [{ rotate: orbit }, { scale: scaleUp }] }]} />
      <Animated.View style={[s.ringMedium, { transform: [{ rotate: orbit }, { scale: scaleDown }] }]} />
      <View style={s.ringSmall} />
      <View style={s.topHalo} />
      <Animated.View style={[s.sparkField, { opacity: sparkle, transform: [{ translateY: driftY }] }]}>
        {Array.from({ length: 20 }).map((_, index) => (
          <View key={index} style={[s.spark, { opacity: 0.16 + ((index % 4) * 0.07) }]} />
        ))}
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999 },
  auroraBand: { position: 'absolute', width: 540, height: 130, top: 210, left: -84, borderRadius: 999, backgroundColor: 'rgba(139,92,246,0.055)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.06)', transform: [{ rotate: '-17deg' }] },
  orbPurple: { width: 300, height: 300, top: -130, right: -108, backgroundColor: 'rgba(124,58,237,0.17)' },
  orbCompact: { top: -170, right: -135 },
  orbBlue: { width: 250, height: 250, top: '37%', left: -158, backgroundColor: 'rgba(37,99,235,0.105)' },
  orbAmber: { width: 230, height: 230, right: -140, bottom: 54, backgroundColor: 'rgba(245,166,35,0.085)' },
  ringLarge: { position: 'absolute', width: 210, height: 210, top: 92, right: -122, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(124,58,237,0.16)' },
  ringMedium: { position: 'absolute', width: 148, height: 148, top: 123, right: -91, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(37,99,235,0.1)' },
  ringSmall: { position: 'absolute', width: 106, height: 106, bottom: 105, left: -56, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(37,99,235,0.12)' },
  topHalo: { position: 'absolute', width: 74, height: 74, top: 28, left: -40, borderRadius: 999, borderWidth: 12, borderColor: 'rgba(245,166,35,0.035)' },
  sparkField: { position: 'absolute', top: 150, left: 22, width: 100, flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  spark: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: '#7c3aed' },
});

export default AppBackdrop;
