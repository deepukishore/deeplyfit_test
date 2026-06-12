import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetworkStatus } from '../context/NetworkContext';
import { colors } from '../utils/theme';

const OfflineBanner = () => {
  const { online, syncing, pendingCount } = useNetworkStatus();
  if (online && !syncing && pendingCount === 0) return null;

  return (
    <View style={[s.banner, online ? s.bannerOnline : s.bannerOffline]}>
      <View style={[s.dot, online ? s.dotOnline : s.dotOffline]} />
      <Text style={s.text}>
        <Text style={s.bold}>{online ? 'Back online' : 'Offline mode'}</Text>
        {online
          ? (syncing ? ' Syncing your saved diary changes...' : ` ${pendingCount} queued change${pendingCount === 1 ? '' : 's'} still pending.`)
          : " Today's diary is cached locally. New entries will sync when your internet returns."}
      </Text>
    </View>
  );
};

const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 16 },
  bannerOnline: { backgroundColor: 'rgba(200,241,53,0.1)' },
  bannerOffline: { backgroundColor: 'rgba(248,113,113,0.1)' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  dotOnline: { backgroundColor: colors.accentLime },
  dotOffline: { backgroundColor: colors.accentCoral },
  text: { flex: 1, fontSize: 13, color: colors.textSecondary },
  bold: { fontWeight: '700' },
});

export default OfflineBanner;
