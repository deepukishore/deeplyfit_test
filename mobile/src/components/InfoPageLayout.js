import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppBackdrop from './AppBackdrop';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';

const InfoPageLayout = ({ navigation, title, eyebrow, intro, children, footer, scroll = true }) => {
  const body = (
    <>
      {(eyebrow || intro) ? (
        <View style={s.hero}>
          {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
          {intro ? <Text style={s.intro}>{intro}</Text> : null}
        </View>
      ) : null}
      {children}
      {footer ? <Text style={s.footer}>{footer}</Text> : null}
    </>
  );

  return (
    <SafeAreaView style={s.page} edges={['top']}>
      <AppBackdrop />
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={s.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={s.headerSpacer} />
      </View>
      {scroll ? (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>{body}</ScrollView>
      ) : (
        <View style={[s.content, s.fixedContent]}>{body}</View>
      )}
    </SafeAreaView>
  );
};

export const InfoSection = ({ title, children }) => (
  <View style={s.section}>
    <Text style={s.sectionTitle}>{title}</Text>
    {typeof children === 'string' ? <Text style={s.body}>{children}</Text> : children}
  </View>
);

export const InfoParagraph = ({ children }) => <Text style={s.body}>{children}</Text>;

export const InfoBullet = ({ children }) => (
  <View style={s.bulletRow}>
    <View style={s.bullet} />
    <Text style={s.bulletText}>{children}</Text>
  </View>
);

export const InfoLinkRow = ({ icon, title, detail, onPress, badge }) => (
  <TouchableOpacity style={s.linkRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
    <View style={s.linkIcon}><Text style={s.linkIconText}>{icon || '?'}</Text></View>
    <View style={s.linkCopy}>
      <View style={s.linkTitleRow}>
        <Text style={s.linkTitle}>{title}</Text>
        {badge ? <Text style={s.badge}>{badge}</Text> : null}
      </View>
      {detail ? <Text style={s.linkDetail}>{detail}</Text> : null}
    </View>
    <Text style={s.arrow}>{'>'}</Text>
  </TouchableOpacity>
);

export const infoPageStyles = createThemedStyles(() => ({
  card: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  button: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.accentLime, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  buttonText: { color: colors.textInverse, fontSize: 14, fontWeight: '800' },
  secondaryButton: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
}));

const s = createThemedStyles(() => ({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.headerBackground },
  backButton: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  backButtonText: { color: colors.textPrimary, fontSize: 19, fontWeight: '700' },
  headerTitle: { flex: 1, marginHorizontal: 12, textAlign: 'center', color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 38 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48 },
  fixedContent: { flex: 1, justifyContent: 'center' },
  hero: { paddingVertical: 12, marginBottom: 12 },
  eyebrow: { color: colors.accentPurple, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  intro: { color: colors.textSecondary, fontSize: 15, lineHeight: 23 },
  section: { padding: spacing.lg, marginBottom: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '800', marginBottom: 9 },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, marginBottom: 7 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentLime, marginTop: 7, marginRight: 10 },
  bulletText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  footer: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 10 },
  linkRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgCard },
  linkIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  linkIconText: { color: colors.accentPurple, fontSize: 12, fontWeight: '900' },
  linkCopy: { flex: 1 },
  linkTitleRow: { flexDirection: 'row', alignItems: 'center' },
  linkTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  linkDetail: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  badge: { marginLeft: 8, color: colors.accentPurple, backgroundColor: colors.bgElevated, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2, fontSize: 9, fontWeight: '800' },
  arrow: { color: colors.textMuted, fontSize: 18, marginLeft: 8 },
}));

export default InfoPageLayout;
