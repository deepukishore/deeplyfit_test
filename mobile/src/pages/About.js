import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../utils/theme';

const CAPABILITIES = [
  ['AI', 'Personal AI coach', 'Guidance connected to your nutrition, workouts, and progress.'],
  ['SCAN', 'Faster food logging', 'Search, scan, and quantity-aware tools for accurate daily tracking.'],
  ['DATA', 'Clear progress', 'Calories, macros, hydration, workouts, and trends in one focused place.'],
];

const LEADERS = [
  {
    initials: 'D',
    name: 'Deepthi',
    role: 'Co-Founder & CEO',
    ownership: 'Owns the vision',
    description: 'Deepthi leads the product vision for Deeply Fit, shaping intelligent fitness guidance that feels clear, personal, and useful every day.',
  },
  {
    initials: 'DK',
    name: 'Deepu Kishore',
    role: 'Co-Founder & CTO',
    ownership: 'Owns the technology',
    description: 'Deepu Kishore leads the technology behind Deeply Fit across AI coaching, nutrition, progress tracking, community, and platform reliability.',
  },
];

const About = ({ navigation }) => {
  const floatValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(floatValue, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(floatValue, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [floatValue]);

  const floatStyle = {
    transform: [{ translateY: floatValue.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
  };

  return (
    <SafeAreaView style={s.page} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Text style={s.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>About</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Animated.View style={[s.heroMark, floatStyle]}><Text style={s.heroMarkText}>DF</Text></Animated.View>
          <Text style={s.kicker}>INTELLIGENTLY DEEP. DEEPLY FIT.</Text>
          <Text style={s.title}>Deeply Fit</Text>
          <Text style={s.lead}>
            A clearer way to understand what you eat, how you move, and where your routine is taking you.
          </Text>
          <View style={s.signalRow}>
            <View style={s.signal}><Text style={s.signalValue}>AI</Text><Text style={s.signalLabel}>Coach</Text></View>
            <View style={s.signal}><Text style={s.signalValue}>1</Text><Text style={s.signalLabel}>Daily view</Text></View>
            <View style={s.signal}><Text style={s.signalValue}>360</Text><Text style={s.signalLabel}>Progress</Text></View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.eyebrow}>WHY WE BUILT IT</Text>
          <Text style={s.sectionTitle}>Fitness data should feel useful, not overwhelming.</Text>
          <Text style={s.body}>
            Deeply Fit connects food logging, workouts, hydration, progress, community, and AI coaching so your data leads to a practical next action.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.eyebrow}>ONE CONNECTED SYSTEM</Text>
          <Text style={s.sectionTitle}>Built around your real routine</Text>
          {CAPABILITIES.map(([mark, title, description]) => (
            <View style={s.capability} key={title}>
              <View style={s.capabilityMark}><Text style={s.capabilityMarkText}>{mark}</Text></View>
              <View style={s.capabilityCopy}>
                <Text style={s.cardTitle}>{title}</Text>
                <Text style={s.cardBody}>{description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.eyebrow}>LEADERSHIP</Text>
          <Text style={s.sectionTitle}>One vision. One technology foundation.</Text>
          {LEADERS.map((leader) => (
            <View style={s.person} key={leader.role}>
              <View style={s.avatar}><Text style={s.avatarText}>{leader.initials}</Text></View>
              <View style={s.personCopy}>
                <Text style={s.role}>{leader.role}</Text>
                <Text style={s.personName}>{leader.name}</Text>
                <Text style={s.ownership}>{leader.ownership}</Text>
                <Text style={s.cardBody}>{leader.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.closing}>
          <Text style={s.closingTitle}>Progress over perfection.</Text>
          <Text style={s.cardBody}>Small, repeatable actions matter more than flawless days.</Text>
          <TouchableOpacity style={s.primaryButton} onPress={() => navigation.navigate('Main', { screen: 'Diary' })}>
            <Text style={s.primaryButtonText}>Log today</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgCard },
  backButton: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  backButtonText: { color: colors.textPrimary, fontSize: 19, fontWeight: '700' },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 38 },
  content: { padding: spacing.lg, paddingBottom: 44 },
  hero: { alignItems: 'center', paddingVertical: 34, borderBottomWidth: 1, borderBottomColor: colors.border },
  heroMark: { width: 82, height: 82, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPurple, marginBottom: 22, shadowColor: colors.accentPurple, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  heroMarkText: { color: '#fff', fontSize: 25, fontWeight: '900' },
  kicker: { color: colors.accentLime, fontSize: 10, fontWeight: '800', marginBottom: 10 },
  title: { color: colors.textPrimary, fontSize: 40, fontWeight: '900', marginBottom: 12 },
  lead: { color: colors.textSecondary, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 330 },
  signalRow: { flexDirection: 'row', marginTop: 26, gap: 8 },
  signal: { flex: 1, minWidth: 88, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  signalValue: { color: colors.accentLime, fontWeight: '900', fontSize: 16 },
  signalLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  section: { paddingVertical: 30, borderBottomWidth: 1, borderBottomColor: colors.border },
  eyebrow: { color: colors.accentLime, fontSize: 10, fontWeight: '800', marginBottom: 8 },
  sectionTitle: { color: colors.textPrimary, fontSize: 24, lineHeight: 31, fontWeight: '800', marginBottom: 13 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  capability: { flexDirection: 'row', paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border },
  capabilityMark: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: 'rgba(168,85,247,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  capabilityMarkText: { color: colors.accentLime, fontSize: 10, fontWeight: '900' },
  capabilityCopy: { flex: 1 },
  cardTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 5 },
  cardBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  person: { flexDirection: 'row', padding: 18, marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  avatar: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.accentPurple, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  personCopy: { flex: 1 },
  role: { color: colors.accentLime, fontSize: 10, fontWeight: '900', marginBottom: 4 },
  personName: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  ownership: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 2, marginBottom: 8 },
  closing: { paddingVertical: 30 },
  closingTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 7 },
  primaryButton: { height: 48, marginTop: 20, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentLime },
  primaryButtonText: { color: colors.textInverse, fontSize: 14, fontWeight: '800' },
});

export default About;
