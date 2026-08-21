import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';

const NoSearchResults = ({ query, onClear, compact = false }) => (
  <View style={[s.container, compact && s.compact]} accessibilityLiveRegion="polite">
    <View style={[s.icon, compact && s.iconCompact]}><Text style={s.iconText}>?</Text></View>
    <Text style={s.title}>No search results</Text>
    <Text style={s.copy}>
      {query ? `We couldn't find a match for “${query}”. Try a shorter or more general term.` : 'Try a shorter or more general search term.'}
    </Text>
    {onClear ? (
      <TouchableOpacity style={s.button} onPress={onClear} accessibilityRole="button">
        <Text style={s.buttonText}>Clear search</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const s = createThemedStyles(() => ({
  container: { alignItems: 'center', padding: spacing.xl, marginVertical: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  compact: { padding: spacing.lg },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, marginBottom: 12 },
  iconCompact: { width: 42, height: 42, borderRadius: 21, marginBottom: 9 },
  iconText: { color: colors.accentPurple, fontSize: 23, fontWeight: '900' },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  copy: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  button: { marginTop: 13, paddingHorizontal: 15, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
}));

export default NoSearchResults;
