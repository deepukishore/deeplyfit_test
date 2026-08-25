import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import InfoPageLayout, { infoPageStyles } from '../components/InfoPageLayout';
import NoSearchResults from '../components/NoSearchResults';
import { useNetworkStatus } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';

const STATE_COPY = {
  Maintenance: {
    mark: 'MT',
    title: 'A quick tune-up',
    body: 'Deeply Fit is temporarily unavailable while we improve the service. Your saved account data is safe.',
    hint: 'Please try again in a few minutes.',
  },
  Offline: {
    mark: 'OF',
    title: 'You are offline',
    body: 'You can keep using recently cached diary information. Supported changes will sync automatically when your connection returns.',
    hint: 'Check Wi-Fi or mobile data, then try again.',
  },
  SessionExpired: {
    mark: 'EX',
    title: 'Your session expired',
    body: 'For your security, you have been signed out. Sign in again to continue where you left off.',
    hint: 'Your account information has not been deleted.',
  },
};

const GENERAL_STATE_COPY = {
  NotFound: {
    code: '404',
    header: 'Page not found',
    title: 'That page took a wrong turn',
    body: 'The page may have moved, the link may be outdated, or the address may be incomplete.',
    hint: 'Your account and saved progress are unaffected.',
    primary: 'Go to home',
    secondary: 'Go back',
    tone: 'purple',
  },
  Forbidden: {
    code: '403',
    header: 'Access denied',
    title: 'You cannot access this page',
    body: 'This area may require a different account, permission, or membership level.',
    hint: 'If you believe this is a mistake, contact support.',
    primary: 'Go back',
    secondary: 'Contact support',
    tone: 'amber',
  },
  ServerError: {
    code: '500',
    header: 'Server error',
    title: 'We hit an unexpected problem',
    body: 'Deeply Fit could not complete that request. Your saved information has not been changed.',
    hint: 'Try again now, or return in a few minutes.',
    primary: 'Try again',
    secondary: 'Contact support',
    tone: 'coral',
  },
  EmptyState: {
    code: '—',
    header: 'Nothing here yet',
    title: 'Start with your first entry',
    body: 'This space will fill up as you log meals, workouts, progress, or community activity.',
    hint: 'Small steps count. Add something whenever you are ready.',
    primary: 'Get started',
    tone: 'purple',
  },
  ErrorState: {
    code: '!',
    header: 'Something went wrong',
    title: 'We could not complete that action',
    body: 'A temporary problem interrupted the request. Please try again.',
    hint: 'If it keeps happening, our support team can help.',
    primary: 'Try again',
    secondary: 'Contact support',
    tone: 'coral',
  },
  SuccessState: {
    code: 'OK',
    header: 'Success',
    title: 'You are all set',
    body: 'Your changes were saved successfully.',
    hint: 'You can safely continue with your Deeply Fit journey.',
    primary: 'Continue',
    tone: 'lime',
  },
};

const navigateFallback = (navigation, user, routeName, replace = false) => {
  if (routeName) {
    if (replace) navigation.replace(routeName);
    else navigation.navigate(routeName);
    return;
  }
  if (navigation.canGoBack()) navigation.goBack();
  else navigation.navigate(user ? 'Main' : 'Login');
};

const GeneralStatePage = ({ navigation, route, kind }) => {
  const { user } = useAuth();
  const defaults = GENERAL_STATE_COPY[kind];
  const params = route?.params || {};
  const content = {
    ...defaults,
    title: params.title || defaults.title,
    body: params.message || defaults.body,
    hint: params.hint || defaults.hint,
    primary: params.primaryLabel || defaults.primary,
  };

  const handlePrimary = () => {
    if (kind === 'NotFound') {
      navigation.reset({ index: 0, routes: [{ name: user ? 'Main' : 'Login' }] });
      return;
    }
    navigateFallback(navigation, user, params.returnTo, kind === 'ServerError' || kind === 'ErrorState');
  };

  const handleSecondary = () => {
    if (kind === 'NotFound') navigateFallback(navigation, user);
    else navigation.navigate('Support');
  };

  return (
    <InfoPageLayout navigation={navigation} title={content.header} scroll={false}>
      <View style={s.stateCard} accessibilityLiveRegion={kind === 'SuccessState' ? 'polite' : 'assertive'}>
        <View style={[s.mark, s[`mark_${content.tone}`]]}><Text style={[s.markText, s[`markText_${content.tone}`]]}>{content.code}</Text></View>
        <Text style={s.title}>{content.title}</Text>
        <Text style={s.body}>{content.body}</Text>
        <View style={s.statusPill}>
          <View style={[s.dot, s[`dot_${content.tone}`]]} />
          <Text style={s.hint}>{content.hint}</Text>
        </View>
        <TouchableOpacity style={[shared.button, s.button]} onPress={handlePrimary} accessibilityRole="button">
          <Text style={shared.buttonText}>{content.primary}</Text>
        </TouchableOpacity>
        {content.secondary ? (
          <TouchableOpacity style={s.supportLink} onPress={handleSecondary} accessibilityRole="button">
            <Text style={s.supportLinkText}>{content.secondary}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </InfoPageLayout>
  );
};

export const NotFound = (props) => <GeneralStatePage {...props} kind="NotFound" />;
export const Forbidden = (props) => <GeneralStatePage {...props} kind="Forbidden" />;
export const ServerError = (props) => <GeneralStatePage {...props} kind="ServerError" />;
export const EmptyState = (props) => <GeneralStatePage {...props} kind="EmptyState" />;
export const ErrorState = (props) => <GeneralStatePage {...props} kind="ErrorState" />;
export const SuccessState = (props) => <GeneralStatePage {...props} kind="SuccessState" />;

export const LoadingState = ({ navigation, route }) => (
  <InfoPageLayout navigation={navigation} title="Loading" scroll={false}>
    <View style={s.stateCard} accessibilityLiveRegion="polite">
      <View style={[s.mark, s.mark_purple]}>
        <ActivityIndicator size="large" color={colors.accentPurple} />
      </View>
      <Text style={s.title}>{route?.params?.title || 'Getting things ready'}</Text>
      <Text style={s.body}>{route?.params?.message || 'We are loading the latest information for you.'}</Text>
      <View style={s.loadingTrack}><View style={s.loadingFill} /></View>
      <Text style={s.loadingHint}>This should only take a moment.</Text>
    </View>
  </InfoPageLayout>
);

const StatusState = ({ navigation, kind }) => {
  const state = STATE_COPY[kind];
  const { online, syncing, syncOfflineChanges } = useNetworkStatus();
  const { user, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const handlePrimary = async () => {
    if (kind === 'SessionExpired') {
      if (user) await logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    setChecking(true);
    try {
      if (kind === 'Offline' && online) await syncOfflineChanges(true);
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate(user ? 'Main' : 'Login');
    } finally {
      setChecking(false);
    }
  };

  const buttonText = kind === 'SessionExpired'
    ? 'Sign in again'
    : kind === 'Offline'
      ? (online ? 'Continue online' : 'Try again')
      : 'Try again';

  return (
    <InfoPageLayout navigation={navigation} title={kind === 'SessionExpired' ? 'Session expired' : kind} scroll={false}>
      <View style={s.stateCard}>
        <View style={s.mark}><Text style={s.markText}>{state.mark}</Text></View>
        <Text style={s.title}>{state.title}</Text>
        <Text style={s.body}>{state.body}</Text>
        <View style={s.statusPill}>
          <View style={[s.dot, kind === 'Offline' && online ? s.dotOnline : null]} />
          <Text style={s.hint}>{kind === 'Offline' && online ? 'Connection restored' : state.hint}</Text>
        </View>
        <TouchableOpacity style={[shared.button, s.button]} onPress={handlePrimary} disabled={checking || syncing}>
          {checking || syncing ? <ActivityIndicator color={colors.textInverse} /> : <Text style={shared.buttonText}>{buttonText}</Text>}
        </TouchableOpacity>
        {kind !== 'SessionExpired' ? (
          <TouchableOpacity style={s.supportLink} onPress={() => navigation.navigate('Support')}>
            <Text style={s.supportLinkText}>Contact support</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </InfoPageLayout>
  );
};

export const Maintenance = (props) => <StatusState {...props} kind="Maintenance" />;
export const Offline = (props) => <StatusState {...props} kind="Offline" />;
export const SessionExpired = (props) => <StatusState {...props} kind="SessionExpired" />;

export const NoSearchResultsPage = ({ navigation, route }) => (
  <InfoPageLayout navigation={navigation} title="Search" scroll={false}>
    <NoSearchResults query={route.params?.query} onClear={() => navigation.goBack()} />
  </InfoPageLayout>
);

const shared = infoPageStyles;
const s = createThemedStyles(() => ({
  stateCard: { alignItems: 'center', padding: spacing.xl, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl },
  mark: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  markText: { color: colors.accentPurple, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  mark_purple: { backgroundColor: colors.glowPurple, borderColor: colors.border },
  mark_amber: { backgroundColor: 'rgba(245,166,35,0.12)', borderColor: 'rgba(245,166,35,0.28)' },
  mark_coral: { backgroundColor: 'rgba(248,113,113,0.12)', borderColor: 'rgba(248,113,113,0.28)' },
  mark_lime: { backgroundColor: 'rgba(200,241,53,0.12)', borderColor: 'rgba(200,241,53,0.28)' },
  markText_purple: { color: colors.accentPurple },
  markText_amber: { color: colors.accentAmber },
  markText_coral: { color: colors.accentCoral },
  markText_lime: { color: colors.accentLime },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 20, backgroundColor: colors.bgElevated, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accentCoral, marginRight: 8 },
  dotOnline: { backgroundColor: colors.accentLime },
  dot_purple: { backgroundColor: colors.accentPurple },
  dot_amber: { backgroundColor: colors.accentAmber },
  dot_coral: { backgroundColor: colors.accentCoral },
  dot_lime: { backgroundColor: colors.accentLime },
  hint: { color: colors.textMuted, fontSize: 11 },
  button: { width: '100%' },
  supportLink: { padding: 13, marginTop: 4 },
  supportLinkText: { color: colors.accentPurple, fontSize: 13, fontWeight: '700' },
  loadingTrack: { width: '100%', height: 7, borderRadius: 4, backgroundColor: colors.bgElevated, overflow: 'hidden', marginTop: 24 },
  loadingFill: { width: '62%', height: '100%', borderRadius: 4, backgroundColor: colors.accentPurple },
  loadingHint: { color: colors.textMuted, fontSize: 11, marginTop: 10 },
}));
