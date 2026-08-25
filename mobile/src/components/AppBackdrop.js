import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';
import { colors, createThemedStyles } from '../utils/theme';

const buildMotionTrail = (phase, xOffset = 0, scale = 1) => (
  Array.from({ length: 38 }, (_, index) => {
    const progress = index / 37;
    const angle = (progress * Math.PI * 3.2) + phase;
    const radius = (48 + (progress * 42)) * scale;
    const x = 220 + xOffset + (Math.sin(angle) * radius);
    const y = 54 + (progress * 620);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ')
);

const PARTICLES = Array.from({ length: 30 }, (_, index) => ({
  x: 14 + ((index * 79) % 396),
  y: 18 + ((index * 137) % 684),
  radius: 1 + ((index % 3) * 0.45),
  opacity: 0.1 + ((index % 5) * 0.035),
}));

const ENERGY_ORBS = [
  [82, 556, 4.2],
  [214, 92, 3.4],
  [334, 238, 4.8],
  [374, 502, 3.1],
  [128, 342, 3.8],
];

const POLY_POINTS = '48,56 86,35 121,61 112,105 72,124 37,96';
const POLY_INNER_POINTS = '48,56 79,75 121,61 79,75 112,105 79,75 72,124 79,75 37,96 79,75 48,56';

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
        ]),
      );
      loop.start();
    });

    return () => {
      active = false;
      if (loop) loop.stop();
      progress.stopAnimation();
    };
  }, [isFocused, progress]);

  const trails = useMemo(() => [
    buildMotionTrail(0, 0, 1),
    buildMotionTrail(Math.PI, 12, 0.94),
    buildMotionTrail(Math.PI / 2, 70, 0.76),
  ], []);

  const driftX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const driftY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const reverseX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const reverseY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const scaleUp = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const scaleDown = progress.interpolate({ inputRange: [0, 1], outputRange: [1.04, 0.96] });
  const orbit = progress.interpolate({ inputRange: [0, 1], outputRange: ['-7deg', '10deg'] });
  const sceneRotateX = progress.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '3deg'] });
  const sceneRotateY = progress.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });
  const sceneRotateZ = progress.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '3deg'] });
  const prismRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '12deg'] });
  const prismFloat = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const sparkle = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.58, 1, 0.7] });
  const sweepY = progress.interpolate({ inputRange: [0, 1], outputRange: [-180, 760] });
  const sweepOpacity = progress.interpolate({ inputRange: [0, 0.15, 0.72, 1], outputRange: [0, 0.2, 0.12, 0] });

  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          s.scene3d,
          compact && s.scene3dCompact,
          {
            transform: [
              { perspective: 950 },
              { translateX: driftX },
              { translateY: driftY },
              { rotateX: sceneRotateX },
              { rotateY: sceneRotateY },
              { rotateZ: sceneRotateZ },
              { scale: compact ? 0.84 : 1 },
            ],
          },
        ]}
      >
        <Svg width="430" height="720" viewBox="0 0 430 720">
          <Defs>
            <LinearGradient id="trailPurple" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.accentPurple} stopOpacity="0.04" />
              <Stop offset="0.5" stopColor={colors.accentPurple} stopOpacity="0.32" />
              <Stop offset="1" stopColor={colors.accentPurple} stopOpacity="0.03" />
            </LinearGradient>
            <LinearGradient id="trailBlue" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.accentBlue} stopOpacity="0.02" />
              <Stop offset="0.55" stopColor={colors.accentBlue} stopOpacity="0.24" />
              <Stop offset="1" stopColor={colors.accentBlue} stopOpacity="0.03" />
            </LinearGradient>
            <LinearGradient id="trailAmber" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.accentAmber} stopOpacity="0.02" />
              <Stop offset="0.5" stopColor={colors.accentAmber} stopOpacity="0.18" />
              <Stop offset="1" stopColor={colors.accentAmber} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          <Polyline points={trails[0]} fill="none" stroke="url(#trailPurple)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points={trails[1]} fill="none" stroke="url(#trailBlue)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points={trails[2]} fill="none" stroke="url(#trailAmber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

          <G x="5" y="78" opacity="0.42">
            <Polygon points={POLY_POINTS} fill="none" stroke={colors.accentPurple} strokeWidth="1.2" />
            <Polyline points={POLY_INNER_POINTS} fill="none" stroke={colors.accentPurple} strokeWidth="0.8" />
            <Line x1="48" y1="56" x2="112" y2="105" stroke={colors.accentBlue} strokeWidth="0.65" />
            <Line x1="121" y1="61" x2="37" y2="96" stroke={colors.accentBlue} strokeWidth="0.65" />
            <Ellipse cx="79" cy="78" rx="67" ry="27" fill="none" stroke={colors.accentPurple} strokeWidth="1" opacity="0.56" rotation="-13" origin="79,78" />
          </G>

          <G opacity="0.5">
            <Ellipse cx="350" cy="550" rx="54" ry="18" fill="none" stroke={colors.accentBlue} strokeWidth="1" rotation="28" origin="350,550" />
            <Ellipse cx="350" cy="550" rx="39" ry="12" fill="none" stroke={colors.accentPurple} strokeWidth="0.8" rotation="-24" origin="350,550" />
          </G>

          {ENERGY_ORBS.map(([x, y, radius], index) => (
            <G key={`energy-${x}-${y}`}>
              <Circle cx={x} cy={y} r={radius * 2.6} fill={colors.accentAmber} opacity={0.035 + ((index % 2) * 0.015)} />
              <Circle cx={x} cy={y} r={radius} fill={colors.accentAmber} opacity={0.34} />
            </G>
          ))}

          {PARTICLES.map((particle) => (
            <Circle
              key={`particle-${particle.x}-${particle.y}`}
              cx={particle.x}
              cy={particle.y}
              r={particle.radius}
              fill={colors.accentBlue}
              opacity={particle.opacity}
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View style={[s.auroraBand, { transform: [{ translateX: driftX }, { translateY: reverseY }, { rotate: '-17deg' }] }]} />
      <Animated.View
        style={[
          s.prism,
          {
            transform: [
              { perspective: 800 },
              { translateY: prismFloat },
              { rotateX: '58deg' },
              { rotateY: prismRotate },
              { rotateZ: '-18deg' },
            ],
          },
        ]}
      >
        <View style={s.prismFace} />
        <View style={s.prismEdge} />
      </Animated.View>
      <Animated.View
        style={[
          s.gem,
          {
            transform: [
              { perspective: 650 },
              { translateX: reverseX },
              { translateY: driftY },
              { rotateX: '42deg' },
              { rotateY: prismRotate },
              { rotateZ: '34deg' },
              { scale: scaleDown },
            ],
          },
        ]}
      />
      <Animated.View style={[s.orb, s.orbPurple, compact && s.orbCompact, { transform: [{ translateX: driftX }, { translateY: driftY }, { scale: scaleUp }] }]} />
      <Animated.View style={[s.orb, s.orbBlue, { transform: [{ translateX: reverseX }, { translateY: reverseY }, { scale: scaleDown }] }]} />
      <Animated.View style={[s.orb, s.orbAmber, { transform: [{ translateX: driftX }, { translateY: reverseY }] }]} />
      <Animated.View style={[s.ringLarge, { transform: [{ perspective: 700 }, { rotateX: '62deg' }, { rotateZ: orbit }, { scale: scaleUp }] }]} />
      <Animated.View style={[s.ringMedium, { transform: [{ perspective: 700 }, { rotateY: '58deg' }, { rotateZ: orbit }, { scale: scaleDown }] }]} />
      <Animated.View style={[s.lightSweep, { opacity: sweepOpacity, transform: [{ translateY: sweepY }, { rotate: '-14deg' }] }]} />
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

const s = createThemedStyles(() => ({
  scene3d: { position: 'absolute', width: 430, height: 720, right: -126, top: 28, opacity: 0.46 },
  scene3dCompact: { right: -172, top: -42, opacity: 0.34 },
  orb: { position: 'absolute', borderRadius: 999 },
  auroraBand: { position: 'absolute', width: 540, height: 130, top: 210, left: -84, borderRadius: 999, backgroundColor: colors.glowPurple, opacity: 0.14, borderWidth: 1, borderColor: colors.border, transform: [{ rotate: '-17deg' }] },
  prism: { position: 'absolute', width: 116, height: 82, top: 168, left: -42, borderRadius: 24, backgroundColor: colors.glowPurple, borderWidth: 1, borderColor: colors.surfaceHighlight, shadowColor: colors.accentPurple, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 8, height: 12 }, elevation: 4 },
  prismFace: { position: 'absolute', top: 10, right: 10, bottom: 10, left: 10, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHighlight, opacity: 0.28 },
  prismEdge: { position: 'absolute', right: 12, bottom: -8, left: 18, height: 10, borderRadius: 8, backgroundColor: colors.accentPurple, opacity: 0.14 },
  gem: { position: 'absolute', width: 62, height: 62, right: 20, bottom: 172, borderRadius: 18, backgroundColor: colors.glowBlue, borderWidth: 1, borderColor: colors.surfaceHighlight, shadowColor: colors.accentBlue, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 7, height: 10 }, elevation: 3 },
  orbPurple: { width: 300, height: 300, top: -130, right: -108, backgroundColor: colors.glowPurple, opacity: 0.48 },
  orbCompact: { top: -170, right: -135 },
  orbBlue: { width: 250, height: 250, top: '37%', left: -158, backgroundColor: colors.glowBlue, opacity: 0.4 },
  orbAmber: { width: 230, height: 230, right: -140, bottom: 54, backgroundColor: colors.accentAmber, opacity: 0.055 },
  ringLarge: { position: 'absolute', width: 210, height: 210, top: 92, right: -122, borderRadius: 999, borderWidth: 1, borderColor: colors.accentPurple, opacity: 0.12 },
  ringMedium: { position: 'absolute', width: 148, height: 148, top: 123, right: -91, borderRadius: 999, borderWidth: 1, borderColor: colors.accentBlue, opacity: 0.1 },
  lightSweep: { position: 'absolute', width: 540, height: 92, left: -70, top: 0, borderRadius: 999, backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.border },
  ringSmall: { position: 'absolute', width: 106, height: 106, bottom: 105, left: -56, borderRadius: 999, borderWidth: 1, borderColor: colors.accentBlue, opacity: 0.2 },
  topHalo: { position: 'absolute', width: 74, height: 74, top: 28, left: -40, borderRadius: 999, borderWidth: 12, borderColor: colors.accentAmber, opacity: 0.045 },
  sparkField: { position: 'absolute', top: 150, left: 22, width: 100, flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  spark: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: colors.accentPurple },
}));

export default AppBackdrop;
