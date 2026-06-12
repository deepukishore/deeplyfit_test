import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Image, ActivityIndicator, ScrollView } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { compressImageUri } from '../utils/image';
import { colors, radius, spacing } from '../utils/theme';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];

const FoodScannerModal = ({ visible, onClose, onSuccess, defaultMeal = 'breakfast', date }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState('ai');
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(defaultMeal);
  const [barcode, setBarcode] = useState('');
  const [barcodeQuantity, setBarcodeQuantity] = useState('1');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!visible) { setImageUri(null); setImageBase64(null); setResult(null); setBarcodeResult(null); setCameraActive(false); }
  }, [visible]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      try {
        const compressed = await compressImageUri(result.assets[0].uri);
        setImageUri(result.assets[0].uri);
        setImageBase64(compressed);
        setResult(null);
      } catch { Toast.show({ type: 'error', text1: 'Could not prepare this image' }); }
    }
  };

  const takePhoto = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Camera permission required' }); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      try {
        const compressed = await compressImageUri(result.assets[0].uri);
        setImageUri(result.assets[0].uri);
        setImageBase64(compressed);
        setResult(null);
      } catch { Toast.show({ type: 'error', text1: 'Could not prepare this image' }); }
    }
  };

  const handleScan = async () => {
    if (!imageBase64) { Toast.show({ type: 'error', text1: 'Please select a food image first' }); return; }
    setScanning(true);
    try {
      const response = await api.scanFood({ image_base64: imageBase64, meal_type: selectedMeal, date });
      setResult(response.food_data);
      Toast.show({ type: 'success', text1: `${response.food_data.name} logged successfully` });
    } catch (err) { Toast.show({ type: 'error', text1: err.message || 'Failed to scan food' }); }
    finally { setScanning(false); }
  };

  const handleLookupBarcode = async () => {
    const clean = barcode.trim();
    if (!clean) { Toast.show({ type: 'error', text1: 'Enter a barcode first' }); return; }
    setBarcodeLoading(true);
    try { const data = await api.lookupBarcode(clean); setBarcodeResult(data); Toast.show({ type: 'success', text1: 'Nutrition loaded' }); }
    catch (err) { setBarcodeResult(null); Toast.show({ type: 'error', text1: err.message || 'Failed to look up barcode' }); }
    finally { setBarcodeLoading(false); }
  };

  const handleLogBarcode = async () => {
    if (!barcodeResult) { Toast.show({ type: 'error', text1: 'Look up a barcode first' }); return; }
    const quantity = Math.max(parseFloat(barcodeQuantity) || 1, 0.1);
    setBarcodeLoading(true);
    try {
      await api.logBarcodeFood({ barcode, date, meal_type: selectedMeal, quantity });
      Toast.show({ type: 'success', text1: `${barcodeResult.name} logged successfully` });
      if (onSuccess) onSuccess(barcodeResult);
      onClose();
    } catch (err) { Toast.show({ type: 'error', text1: err.message || 'Failed to log barcode item' }); }
    finally { setBarcodeLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Smart Food Scanner</Text>
            <Text style={s.subtitle}>AI photos or barcode lookup</Text>
            <Text style={s.limitText}>{user?.premium_status === 'active' ? 'PRO • Unlimited AI scans' : 'FREE • 3 AI scans/day'}</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}><Text style={s.closeBtnText}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
          <View style={s.modeToggle}>
            <TouchableOpacity style={[s.modeBtn, mode === 'ai' && s.modeBtnActive]} onPress={() => setMode('ai')}>
              <Text style={[s.modeBtnText, mode === 'ai' && s.modeBtnTextActive]}>AI Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modeBtn, mode === 'barcode' && s.modeBtnActive]} onPress={() => setMode('barcode')}>
              <Text style={[s.modeBtnText, mode === 'barcode' && s.modeBtnTextActive]}>Barcode</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.sectionLabel}>Log to meal</Text>
          <View style={s.mealRow}>
            {MEALS.map((meal) => (
              <TouchableOpacity key={meal} style={[s.mealChip, selectedMeal === meal && s.mealChipActive]} onPress={() => setSelectedMeal(meal)}>
                <Text style={[s.mealChipText, selectedMeal === meal && s.mealChipTextActive]}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'ai' && (
            <>
              {!imageUri ? (
                <View style={s.uploadZone}>
                  <TouchableOpacity style={s.uploadBtn} onPress={takePhoto}><Text style={s.uploadBtnText}>📷 Take Photo</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.uploadBtn, { marginTop: 8 }]} onPress={pickImage}><Text style={s.uploadBtnText}>🖼️ Choose from Library</Text></TouchableOpacity>
                </View>
              ) : (
                <View style={s.imagePreview}>
                  <Image source={{ uri: imageUri }} style={s.previewImg} />
                  {!scanning && (
                    <TouchableOpacity style={s.removeBtn} onPress={() => { setImageUri(null); setImageBase64(null); setResult(null); }}>
                      <Text style={s.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {result && (
                <View style={s.resultCard}>
                  <Text style={s.resultName}>{result.name}</Text>
                  <Text style={s.resultSub}>Saved to {selectedMeal}</Text>
                  <View style={s.macroGrid}>
                    {[{ label: 'kcal', value: Math.round(result.calories), color: colors.accentAmber }, { label: 'protein', value: `${Math.round(result.protein)}g`, color: colors.accentBlue }, { label: 'carbs', value: `${Math.round(result.carbs)}g`, color: colors.accentLime }, { label: 'fat', value: `${Math.round(result.fat)}g`, color: colors.accentCoral }].map((m) => (
                      <View key={m.label} style={s.macroItem}>
                        <Text style={[s.macroValue, { color: m.color }]}>{m.value}</Text>
                        <Text style={s.macroLabel}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {!result ? (
                <TouchableOpacity style={[s.btn, (!imageBase64 || scanning) && s.btnDisabled]} onPress={handleScan} disabled={!imageBase64 || scanning}>
                  {scanning ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Scan with AI</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.btn} onPress={() => { if (onSuccess) onSuccess(result); onClose(); }}>
                  <Text style={s.btnText}>Done ✓</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {mode === 'barcode' && (
            <>
              <View style={s.inputGroup}><Text style={s.label}>Barcode</Text><TextInput style={s.input} value={barcode} onChangeText={setBarcode} placeholder="Enter EAN / UPC barcode" placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View>
              <View style={s.inputGroup}><Text style={s.label}>Servings</Text><TextInput style={s.input} value={barcodeQuantity} onChangeText={setBarcodeQuantity} keyboardType="numeric" /></View>
              <TouchableOpacity style={[s.btnSec, barcodeLoading && s.btnDisabled]} onPress={handleLookupBarcode} disabled={barcodeLoading}>
                {barcodeLoading ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={s.btnSecText}>Fetch Nutrition</Text>}
              </TouchableOpacity>

              {barcodeResult && (
                <View style={s.resultCard}>
                  <Text style={s.resultName}>{barcodeResult.name}</Text>
                  <Text style={s.resultSub}>{barcodeResult.brand || 'Open Food Facts'} · {barcodeResult.nutrition_basis}</Text>
                  <View style={s.macroGrid}>
                    {[{ label: 'kcal', value: Math.round(barcodeResult.calories), color: colors.accentAmber }, { label: 'protein', value: `${Math.round(barcodeResult.protein)}g`, color: colors.accentBlue }, { label: 'carbs', value: `${Math.round(barcodeResult.carbs)}g`, color: colors.accentLime }, { label: 'fat', value: `${Math.round(barcodeResult.fat)}g`, color: colors.accentCoral }].map((m) => (
                      <View key={m.label} style={s.macroItem}>
                        <Text style={[s.macroValue, { color: m.color }]}>{m.value}</Text>
                        <Text style={s.macroLabel}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity style={[s.btn, (!barcodeResult || barcodeLoading) && s.btnDisabled]} onPress={handleLogBarcode} disabled={!barcodeResult || barcodeLoading}>
                {barcodeLoading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Log Barcode Food</Text>}
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  limitText: { fontSize: 12, color: colors.accentLime, marginTop: 6, fontWeight: '700' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
  body: { flex: 1, padding: spacing.lg },
  modeToggle: { flexDirection: 'row', backgroundColor: colors.bgElevated, borderRadius: 12, padding: 4, marginBottom: 20 },
  modeBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.accentLime },
  modeBtnText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  modeBtnTextActive: { color: colors.textInverse },
  sectionLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  mealRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  mealChip: { flex: 1, padding: 8, borderRadius: 8, backgroundColor: colors.bgElevated, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  mealChipActive: { backgroundColor: 'rgba(200,241,53,0.12)', borderColor: colors.accentLime },
  mealChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  mealChipTextActive: { color: colors.accentLime },
  uploadZone: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  uploadBtn: { backgroundColor: colors.bgElevated, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, width: '100%', alignItems: 'center' },
  uploadBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  imagePreview: { borderRadius: radius.xl, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  previewImg: { width: '100%', height: 220, borderRadius: radius.xl },
  removeBtn: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#fff', fontWeight: '700' },
  resultCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  resultName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  resultSub: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  macroGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center', flex: 1 },
  macroValue: { fontSize: 20, fontWeight: '800' },
  macroLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: colors.bgElevated, borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnSec: { backgroundColor: colors.bgElevated, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.textInverse, fontWeight: '800', fontSize: 16 },
  btnSecText: { color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
});

export default FoodScannerModal;
