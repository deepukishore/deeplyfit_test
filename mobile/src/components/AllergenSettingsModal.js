import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';
import { colors, radius, spacing } from '../utils/theme';

const COMMON_ALLERGENS = ['gluten', 'lactose', 'nuts', 'peanuts', 'eggs', 'soy', 'shellfish', 'fish', 'sesame', 'mustard'];

const AllergenSettingsModal = ({ visible, onClose, onSave }) => {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const fetch = async () => {
      try { const data = await api.getAllergens(); setSelected(data.allergens || []); }
      catch {}
      finally { setLoading(false); }
    };
    fetch();
  }, [visible]);

  const toggle = (allergen) => setSelected((cur) => cur.includes(allergen) ? cur.filter((a) => a !== allergen) : [...cur, allergen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.setAllergens(selected);
      Toast.show({ type: 'success', text1: 'Allergens updated' });
      onSave(); onClose();
    } catch (err) { Toast.show({ type: 'error', text1: err.message || 'Could not update allergens' }); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.modalTitle}>Allergens & Intolerances</Text>
          <Text style={s.subtitle}>Select allergens you want to be warned about when logging food</Text>
          {loading ? <ActivityIndicator color={colors.accentLime} style={{ marginVertical: 20 }} /> : (
            <ScrollView>
              <View style={s.grid}>
                {COMMON_ALLERGENS.map((allergen) => (
                  <TouchableOpacity key={allergen} style={[s.allergenChip, selected.includes(allergen) && s.allergenChipActive]} onPress={() => toggle(allergen)}>
                    <Text style={[s.allergenText, selected.includes(allergen) && s.allergenTextActive]}>{allergen.charAt(0).toUpperCase() + allergen.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.btnRow}>
                <TouchableOpacity style={[s.btnSec, { flex: 1, marginRight: 8 }]} onPress={onClose}><Text style={s.btnSecText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={handleSave} disabled={loading}>
                  <Text style={s.btnText}>Save Allergens</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '80%' },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  allergenChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  allergenChipActive: { backgroundColor: 'rgba(200,241,53,0.12)', borderColor: colors.accentLime },
  allergenText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  allergenTextActive: { color: colors.accentLime },
  btnRow: { flexDirection: 'row' },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnSec: { backgroundColor: colors.bgElevated, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  btnText: { color: colors.textInverse, fontWeight: '800', fontSize: 15 },
  btnSecText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
});

export default AllergenSettingsModal;
