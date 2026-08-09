import React, { useEffect, useMemo } from 'react';
import { Pressable } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  LinearTransition,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const enteringFor = (variant, delay) => {
  const base = variant === 'fade'
    ? FadeIn
    : variant === 'left'
      ? FadeInLeft
      : FadeInDown;

  return base
    .delay(Math.max(0, delay))
    .springify()
    .damping(17)
    .stiffness(145)
    .mass(0.72)
    .reduceMotion(ReduceMotion.System);
};

export const MotionView = ({ children, delay = 0, variant = 'rise', style, layout = false, ...props }) => {
  const entering = useMemo(() => enteringFor(variant, delay), [delay, variant]);
  const layoutTransition = useMemo(
    () => (layout ? LinearTransition.springify().damping(18).reduceMotion(ReduceMotion.System) : undefined),
    [layout],
  );

  return (
    <Animated.View entering={entering} layout={layoutTransition} style={style} {...props}>
      {children}
    </Animated.View>
  );
};

export const ScreenTransition = ({ children, style }) => {
  const focused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(1);

  useEffect(() => {
    if (!focused || reduceMotion) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: 360, reduceMotion: ReduceMotion.System });
  }, [focused, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.72, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [10, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.992, 1]) },
    ],
  }));

  return <Animated.View style={[{ flex: 1 }, style, animatedStyle]}>{children}</Animated.View>;
};

export const MotionPressable = ({ children, style, disabled, onPressIn, onPressOut, ...props }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pressIn = (event) => {
    scale.value = withSpring(0.965, { damping: 16, stiffness: 300, reduceMotion: ReduceMotion.System });
    onPressIn?.(event);
  };

  const pressOut = (event) => {
    scale.value = withSpring(1, { damping: 13, stiffness: 250, reduceMotion: ReduceMotion.System });
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      style={[style, animatedStyle, disabled && { opacity: 0.5 }]}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
};

export const FloatingView = ({ children, style, distance = 5, duration = 1800 }) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    progress.value = withRepeat(
      withTiming(1, { duration, reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [duration, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -distance]) },
      { scale: interpolate(progress.value, [0, 1], [1, 1.025]) },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

export const AnimatedProgressFill = ({ progress = 0, style, duration = 650 }) => {
  const value = useSharedValue(0);
  const clamped = Math.min(Math.max(Number(progress) || 0, 0), 100);

  useEffect(() => {
    value.value = withTiming(clamped, { duration, reduceMotion: ReduceMotion.System });
  }, [clamped, duration, value]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${value.value}%` }));
  return <Animated.View style={[style, animatedStyle]} />;
};

export const AnimatedTabIcon = ({ focused, icon, activeStyle, style, textStyle, indicatorStyle }) => {
  const focusProgress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focusProgress.value = withSpring(focused ? 1 : 0, {
      damping: 13,
      stiffness: 230,
      mass: 0.65,
      reduceMotion: ReduceMotion.System,
    });
  }, [focusProgress, focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(focusProgress.value, [0, 1], [0, -2]) },
      { scale: interpolate(focusProgress.value, [0, 1], [0.92, 1.08]) },
    ],
  }));
  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
    transform: [{ scaleX: interpolate(focusProgress.value, [0, 1], [0.2, 1]) }],
  }));

  return (
    <Animated.View style={[style, focused && activeStyle, animatedStyle]}>
      <Animated.Text style={[textStyle, { opacity: focused ? 1 : 0.45 }]}>{icon}</Animated.Text>
      <Animated.View style={[indicatorStyle, indicatorAnimatedStyle]} />
    </Animated.View>
  );
};
