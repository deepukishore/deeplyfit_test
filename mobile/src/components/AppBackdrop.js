import React from 'react';
import { StyleSheet, View } from 'react-native';

const AppBackdrop = ({ compact = false }) => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={[s.orb, s.orbPurple, compact && s.orbCompact]} />
    <View style={[s.orb, s.orbBlue]} />
    <View style={[s.orb, s.orbAmber]} />
    <View style={s.ringLarge} />
    <View style={s.ringSmall} />
    <View style={s.sparkField}>
      {Array.from({ length: 15 }).map((_, index) => (
        <View key={index} style={[s.spark, { opacity: 0.16 + ((index % 4) * 0.07) }]} />
      ))}
    </View>
  </View>
);

const s = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999 },
  orbPurple: { width: 280, height: 280, top: -120, right: -105, backgroundColor: 'rgba(124,58,237,0.12)' },
  orbCompact: { top: -170, right: -135 },
  orbBlue: { width: 230, height: 230, top: '38%', left: -150, backgroundColor: 'rgba(37,99,235,0.075)' },
  orbAmber: { width: 210, height: 210, right: -135, bottom: 70, backgroundColor: 'rgba(245,166,35,0.065)' },
  ringLarge: { position: 'absolute', width: 190, height: 190, top: 105, right: -118, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(124,58,237,0.11)' },
  ringSmall: { position: 'absolute', width: 96, height: 96, bottom: 120, left: -55, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(37,99,235,0.09)' },
  sparkField: { position: 'absolute', top: 145, left: 22, width: 86, flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  spark: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#7c3aed' },
});

export default AppBackdrop;
