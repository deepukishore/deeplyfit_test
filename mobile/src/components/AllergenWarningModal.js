import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors, radius, spacing } from '../utils/theme';

const AllergenWarningModal = ({ visible, foodName, allergens, onLogAnyway, onCancel }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCancel}>
      <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
        <View style={s.handle} />
        <Text style={s.modalTitle}>⚠️ Allergen Alert</Text>
        <Text style={s.subtitle}><Text style={s.bold}>{foodName}</Text> contains the following allergens you marked:</Text>
        <View style={s.allergenList}>
          {allergens.map((allergen) => (
            <Text key={allergen} style={s.allergenItem}>✓ {allergen.charAt(0).toUpperCase() + allergen.slice(1)}</Text>
          ))}
        </View>
        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btnSec, { flex: 1, marginRight: 8 }]} onPress={onCancel}><Text style={s.btnSecText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={onLogAnyway}><Text style={s.btnText}>Log Anyway</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  bold: { fontWeight: '700', color: colors.textPrimary },
  allergenList: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: spacing.md, marginBottom: 20 },
  allergenItem: { color: colors.textPrimary, fontSize: 15, paddingVertical: 6 },
  btnRow: { flexDirection: 'row' },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnSec: { backgroundColor: colors.bgElevated, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  btnText: { color: colors.textInverse, fontWeight: '800', fontSize: 15 },
  btnSecText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
});

export default AllergenWarningModal;
