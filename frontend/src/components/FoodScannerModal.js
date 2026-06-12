import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import { compressImageFile } from '../utils/image';
import { canScan, incrementScanCount, scansLeft, isPro } from '../utils/premium';
import PremiumModal from './PremiumModal';
import '../styles/scanner.css';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];

const FoodScannerModal = ({ onClose, onSuccess, defaultMeal = 'breakfast', date }) => {
  const [mode, setMode] = useState('ai');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(defaultMeal);
  const [dragOver, setDragOver] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [barcodeQuantity, setBarcodeQuantity] = useState('1');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [detectorSupported, setDetectorSupported] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const fileRef = useRef();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    setDetectorSupported(supported);
    if (supported) {
      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });
      } catch (err) {
        detectorRef.current = null;
      }
    }

    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (mode !== 'barcode') {
      stopCamera();
    }
  }, [mode]);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setProcessingImage(true);
    try {
      const compressedImage = await compressImageFile(file);
      setImagePreview(compressedImage);
      setImageBase64(compressedImage);
      setResult(null);
    } catch (err) {
      toast.error('Could not prepare this image');
    } finally {
      setProcessingImage(false);
    }
  };

  const handleInputChange = (e) => {
    handleFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleScan = async () => {
    if (!imageBase64) {
      toast.error('Please select a food image first');
      return;
    }
    if (!canScan()) {
      setShowPremium(true);
      return;
    }
    setScanning(true);
    try {
      const response = await api.scanFood({
        image_base64: imageBase64,
        meal_type: selectedMeal,
        date,
      });
      incrementScanCount();
      setResult(response.food_data);
      toast.success(`${response.food_data.name} logged successfully`);
    } catch (err) {
      toast.error(err.message || 'Failed to scan food');
    } finally {
      setScanning(false);
    }
  };

  const handleLookupBarcode = async (nextBarcode = barcode) => {
    const cleanBarcode = String(nextBarcode || '').trim();
    if (!cleanBarcode) {
      toast.error('Enter or scan a barcode first');
      return;
    }

    setBarcode(cleanBarcode);
    setBarcodeLoading(true);
    try {
      const data = await api.lookupBarcode(cleanBarcode);
      setBarcodeResult(data);
      toast.success('Nutrition loaded from Open Food Facts');
    } catch (err) {
      setBarcodeResult(null);
      toast.error(err.message || 'Failed to look up barcode');
    } finally {
      setBarcodeLoading(false);
    }
  };

  const detectBarcodeFrame = async () => {
    if (!videoRef.current || !detectorRef.current) return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes?.length) {
        const rawValue = codes[0].rawValue;
        if (rawValue) {
          setBarcode(rawValue);
          stopCamera();
          handleLookupBarcode(rawValue);
          return;
        }
      }
    } catch (err) {
      // Ignore detection frame errors and keep polling.
    }
    rafRef.current = requestAnimationFrame(detectBarcodeFrame);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera access is not supported on this device');
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      if (detectorRef.current) {
        rafRef.current = requestAnimationFrame(detectBarcodeFrame);
      }
    } catch (err) {
      toast.error('Unable to start the camera');
    }
  };

  const handleLogBarcode = async () => {
    if (!barcodeResult) {
      toast.error('Look up a barcode first');
      return;
    }

    const quantity = Math.max(parseFloat(barcodeQuantity) || 1, 0.1);
    setBarcodeLoading(true);
    try {
      await api.logBarcodeFood({
        barcode,
        date,
        meal_type: selectedMeal,
        quantity,
      });
      toast.success(`${barcodeResult.name} logged successfully`);
      if (onSuccess) onSuccess(barcodeResult);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to log barcode item');
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleDone = () => {
    if (onSuccess) onSuccess(result);
    onClose();
  };

  return (
    <>
    <div className="scanner-modal">
      <div className="scanner-header">
        <div>
          <h2 className="scanner-title">Smart Food Scanner</h2>
          <p className="scanner-subtitle">Use AI photos for meals or barcode lookup for packaged foods.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {!isPro() && (
            <span className="badge badge-amber" style={{ cursor: 'pointer' }} onClick={() => setShowPremium(true)}>
              {scansLeft()} scan{scansLeft() !== 1 ? 's' : ''} left today
            </span>
          )}
          {isPro() && <span className="badge badge-pro">💎 PRO</span>}
          <button className="scanner-close" onClick={onClose}>x</button>
        </div>
      </div>

      <div className="scanner-body">
        <div className="scanner-mode-toggle">
          <button className={`scanner-mode-btn ${mode === 'ai' ? 'active' : ''}`} onClick={() => setMode('ai')}>AI Photo</button>
          <button className={`scanner-mode-btn ${mode === 'barcode' ? 'active' : ''}`} onClick={() => setMode('barcode')}>Barcode</button>
        </div>

        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Log to meal
          </p>
          <div className="meal-selector">
            {MEALS.map((meal) => (
              <button
                key={meal}
                className={`meal-chip ${selectedMeal === meal ? 'selected' : ''}`}
                onClick={() => setSelectedMeal(meal)}
              >
                {meal.charAt(0).toUpperCase() + meal.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {mode === 'ai' && (
          <>
            {!imagePreview ? (
              <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleInputChange}
                  style={{ display: 'none' }}
                />
                <div className="upload-icon">Camera</div>
                <p className="upload-text">{processingImage ? 'Compressing photo...' : 'Tap to photograph your food'}</p>
                <p className="upload-subtext">or drag and drop an image</p>
              </div>
            ) : (
              <div className="image-preview">
                <img src={imagePreview} alt="Food preview" />
                {scanning && (
                  <div className="scanning-overlay">
                    <div className="scan-line" />
                    <p style={{ color: 'var(--accent-lime)', fontWeight: 700, fontSize: 14 }}>Analyzing food...</p>
                  </div>
                )}
                {!scanning && (
                  <button className="image-preview-remove" onClick={() => { setImagePreview(null); setImageBase64(null); setResult(null); }}>
                    x
                  </button>
                )}
              </div>
            )}

            {result && (
              <div className="scan-result animate-scale-in">
                <h3 className="scan-result-title">{result.name}</h3>
                <p className="scan-result-subtitle">Saved to {selectedMeal}</p>
                <div className="scan-macros-grid">
                  <div className="scan-macro">
                    <div className="scan-macro-value" style={{ color: 'var(--accent-amber)' }}>{Math.round(result.calories)}</div>
                    <div className="scan-macro-label">kcal</div>
                  </div>
                  <div className="scan-macro">
                    <div className="scan-macro-value" style={{ color: 'var(--accent-blue)' }}>{Math.round(result.protein)}g</div>
                    <div className="scan-macro-label">protein</div>
                  </div>
                  <div className="scan-macro">
                    <div className="scan-macro-value" style={{ color: 'var(--accent-lime)' }}>{Math.round(result.carbs)}g</div>
                    <div className="scan-macro-label">carbs</div>
                  </div>
                  <div className="scan-macro">
                    <div className="scan-macro-value" style={{ color: 'var(--accent-coral)' }}>{Math.round(result.fat)}g</div>
                    <div className="scan-macro-label">fat</div>
                  </div>
                </div>
              </div>
            )}

            <div className="scan-footer">
              {!result ? (
                <>
                  {!isPro() && scansLeft() === 0 ? (
                    <div className="scan-limit-wall">
                      <p className="scan-limit-msg">You've used all your free scans for today.</p>
                      <p className="scan-limit-sub">Upgrade to PRO for unlimited AI food scanning ✨</p>
                      <button className="btn premium-btn btn-full" onClick={() => setShowPremium(true)}>💎 Upgrade to PRO</button>
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-full" onClick={handleScan} disabled={!imageBase64 || scanning}>
                      {scanning ? <><span className="spinner" /> Analyzing...</> : `Scan with AI${!isPro() ? ` (${scansLeft()} left)` : ''}`}
                    </button>
                  )}
                </>
              ) : (
                <button className="btn btn-primary btn-full" onClick={handleDone}>
                  Done
                </button>
              )}
            </div>
          </>
        )}

        {mode === 'barcode' && (
          <>
            <div className="barcode-panel">
              <div className="barcode-panel-copy">
                <h3>Packaged food lookup</h3>
                <p>Scan the label or type the code. Nutrition is fetched from Open Food Facts.</p>
              </div>
              <div className="barcode-actions-row">
                <button className="btn btn-secondary btn-sm" onClick={cameraActive ? stopCamera : startCamera}>
                  {cameraActive ? 'Stop Camera' : 'Start Camera'}
                </button>
                {!detectorSupported && (
                  <span className="barcode-help-text">Auto-detect is not supported here. Manual entry still works.</span>
                )}
              </div>
            </div>

            {cameraActive && (
              <div className="barcode-camera">
                <video ref={videoRef} className="barcode-video" playsInline muted />
                <div className="barcode-frame" />
                <p className="barcode-camera-note">Hold the barcode inside the frame.</p>
              </div>
            )}

            <div className="barcode-form">
              <div className="input-group">
                <label>Barcode</label>
                <input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Enter EAN / UPC barcode"
                  inputMode="numeric"
                />
              </div>
              <div className="input-group">
                <label>Servings</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={barcodeQuantity}
                  onChange={(e) => setBarcodeQuantity(e.target.value)}
                />
              </div>
            </div>

            <button className="btn btn-secondary btn-full" onClick={() => handleLookupBarcode()} disabled={barcodeLoading}>
              {barcodeLoading ? <><span className="spinner" /> Looking up...</> : 'Fetch Nutrition'}
            </button>

            {barcodeResult && (
              <div className="scan-result animate-scale-in">
                <div className="barcode-result-head">
                  <div>
                    <h3 className="scan-result-title">{barcodeResult.name}</h3>
                    <p className="scan-result-subtitle">
                      {barcodeResult.brand || 'Open Food Facts'} · {barcodeResult.nutrition_basis}
                    </p>
                  </div>
                  {barcodeResult.image_url && (
                    <img className="barcode-thumb" src={barcodeResult.image_url} alt={barcodeResult.name} />
                  )}
                </div>
                <div className="scan-macros-grid">
                  <div className="scan-macro">
                    <div className="scan-macro-value" style={{ color: 'var(--accent-amber)' }}>{Math.round(barcodeResult.calories)}</div>
                    <div className="scan-macro-label">kcal</div>
                  </div>
                  <div className="scan-macro">
                    <div className="scan-macro-value" style={{ color: 'var(--accent-blue)' }}>{Math.round(barcodeResult.protein)}g</div>
                    <div className="scan-macro-label">protein</div>
                  </div>
                  <div className="scan-macro">
                    <div className="scan-macro-value" style={{ color: 'var(--accent-lime)' }}>{Math.round(barcodeResult.carbs)}g</div>
                    <div className="scan-macro-label">carbs</div>
                  </div>
                  <div className="scan-macro">
                    <div className="scan-macro-value" style={{ color: 'var(--accent-coral)' }}>{Math.round(barcodeResult.fat)}g</div>
                    <div className="scan-macro-label">fat</div>
                  </div>
                </div>
                <div className="barcode-meta">
                  {barcodeResult.serving_size && <span className="badge badge-blue">{barcodeResult.serving_size}</span>}
                  {barcodeResult.quantity_label && <span className="badge badge-amber">{barcodeResult.quantity_label}</span>}
                </div>
              </div>
            )}

            <div className="scan-footer">
              <button className="btn btn-primary btn-full" onClick={handleLogBarcode} disabled={!barcodeResult || barcodeLoading}>
                {barcodeLoading ? <><span className="spinner" /> Logging...</> : 'Log Barcode Food'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    {showPremium && <PremiumModal onClose={() => setShowPremium(false)} onActivated={() => setShowPremium(false)} />}
    </>
  );
};

export default FoodScannerModal;
