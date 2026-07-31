import React from 'react';
import { StyleSheet, View } from 'react-native';

const AppBackdrop = ({ compact = false }) => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={s.auroraBand} />
    <View style={[s.orb, s.orbPurple, compact && s.orbCompact]} />
    <View style={[s.orb, s.orbBlue]} />
    <View style={[s.orb, s.orbAmber]} />
    <View style={s.ringLarge} />
    <View style={s.ringMedium} />
    <View style={s.ringSmall} />
    <View style={s.topHalo} />
    <View style={s.sparkField}>
      {Array.from({ length: 20 }).map((_, index) => (
        <View key={index} style={[s.spark, { opacity: 0.16 + ((index % 4) * 0.07) }]} />
      ))}
    </View>
  </View>
);

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
