import React, { useState } from 'react';
import { Linking, Text, TextInput, TouchableOpacity, View } from 'react-native';
import InfoPageLayout, { InfoLinkRow, InfoParagraph, InfoSection, infoPageStyles } from '../components/InfoPageLayout';
import { LEGAL_DOCUMENTS } from './LegalDocument';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';

const LEGAL_ROUTES = [
  'PrivacyPolicy', 'TermsOfService', 'CookiePolicy', 'CookiePreferences', 'CancellationPolicy',
  'Disclaimer', 'AccessibilityStatement', 'DataProcessingAgreement', 'AcceptableUsePolicy',
  'SecurityPolicy', 'ResponsibleDisclosure', 'CommunityGuidelines',
];

const FALLBACK_ROWS = {
  CookiePreferences: { title: 'Cookie Preferences', icon: 'CP', detail: 'Choose which optional technologies can be used' },
};

export const LegalCenter = ({ navigation }) => (
  <InfoPageLayout
    navigation={navigation}
    title="Legal & policies"
    eyebrow="Transparency center"
    intro="Find the policies, commitments, and controls that govern your Deeply Fit experience."
  >
    <View style={shared.card}>
      {LEGAL_ROUTES.map((routeName) => {
        const item = LEGAL_DOCUMENTS[routeName] || FALLBACK_ROWS[routeName];
        return <InfoLinkRow key={routeName} {...item} onPress={() => navigation.navigate(routeName)} />;
      })}
    </View>
  </InfoPageLayout>
);

const FAQS = [
  ['How do I change my goals?', 'Open Profile, tap Edit, update your goals, and save. Your nutrition targets and recommendations will refresh from the latest profile details.'],
  ['Can I use the diary offline?', 'Yes. Recently cached diary information remains available, and supported changes are queued securely on your device until a connection returns.'],
  ['How do I cancel Premium?', 'Cancel from the same store or billing channel where you subscribed. Premium normally remains active until the end of the paid period.'],
  ['Are AI coach answers medical advice?', 'No. AI coaching is general wellness information. For medical symptoms, diagnoses, treatment, or significant dietary changes, consult a qualified professional.'],
  ['How do public profiles work?', 'You control profile visibility and achievement sharing from Edit Profile. Review those settings before copying or posting your public link.'],
  ['How do I report a community post?', 'Use the report option on the post or contact Support with enough detail for our team to locate and review it.'],
];

export const HelpCenter = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const results = FAQS.filter(([question, answer]) => !normalized || `${question} ${answer}`.toLowerCase().includes(normalized));

  return (
    <InfoPageLayout
      navigation={navigation}
      title="Help Center"
      eyebrow="Answers, right when you need them"
      intro="Search common questions or jump to a support resource."
    >
      <TextInput
        style={s.search}
        placeholder="Search help"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        accessibilityLabel="Search Help Center"
      />

      {results.length ? results.map(([question, answer]) => (
        <InfoSection title={question} key={question}><InfoParagraph>{answer}</InfoParagraph></InfoSection>
      )) : (
        <View style={s.empty}>
          <Text style={s.emptyMark}>?</Text>
          <Text style={s.emptyTitle}>No help articles found</Text>
          <Text style={s.emptyCopy}>Try fewer words, or ask our support team.</Text>
          <TouchableOpacity style={shared.button} onPress={() => navigation.navigate('Support')}>
            <Text style={shared.buttonText}>Contact support</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={shared.card}>
        <InfoLinkRow icon="SP" title="Support" detail="Contact the team or report a problem" onPress={() => navigation.navigate('Support')} />
        <InfoLinkRow icon="LG" title="Legal & policies" detail="Privacy, terms, safety, and community rules" onPress={() => navigation.navigate('LegalCenter')} />
      </View>
    </InfoPageLayout>
  );
};

export const Support = ({ navigation }) => {
  const openEmail = (subject) => Linking.openURL(`mailto:support@deeplyfit.app?subject=${encodeURIComponent(subject)}`);
  return (
    <InfoPageLayout
      navigation={navigation}
      title="Support"
      eyebrow="We are here to help"
      intro="Choose the fastest route for your question. Include your device type and a short description when reporting a technical problem."
    >
      <View style={shared.card}>
        <InfoLinkRow icon="EM" title="Email support" detail="support@deeplyfit.app" onPress={() => openEmail('Deeply Fit support request')} />
        <InfoLinkRow icon="BG" title="Report a bug" detail="Tell us what happened and how to reproduce it" onPress={() => openEmail('Deeply Fit bug report')} />
        <InfoLinkRow icon="SE" title="Report a security issue" detail="Use our responsible disclosure process" onPress={() => navigation.navigate('ResponsibleDisclosure')} />
        <InfoLinkRow icon="HC" title="Browse Help Center" detail="Answers to common product questions" onPress={() => navigation.navigate('HelpCenter')} />
      </View>
      <InfoSection title="Before you contact us">
        <InfoParagraph>Never email your password, verification codes, payment-card details, or sensitive medical records. Deeply Fit support will not ask for your password.</InfoParagraph>
      </InfoSection>
      <Text style={s.responseNote}>Typical response target: 1–2 business days. Urgent medical or safety situations should be directed to local emergency services.</Text>
    </InfoPageLayout>
  );
};

const shared = infoPageStyles;

const s = createThemedStyles(() => ({
  search: { minHeight: 50, marginBottom: 14, paddingHorizontal: spacing.lg, color: colors.textPrimary, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, fontSize: 14 },
  empty: { alignItems: 'center', padding: spacing.xl, marginBottom: spacing.lg, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  emptyMark: { width: 54, height: 54, borderRadius: 27, textAlign: 'center', textAlignVertical: 'center', color: colors.accentPurple, backgroundColor: colors.bgElevated, fontSize: 25, fontWeight: '900', overflow: 'hidden', marginBottom: 12 },
  emptyTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptyCopy: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  responseNote: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', paddingHorizontal: 12 },
}));
