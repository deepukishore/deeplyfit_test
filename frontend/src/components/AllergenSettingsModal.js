import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import '../styles/dashboard.css';

const COMMON_ALLERGENS = [
  'gluten',
  'lactose',
  'nuts',
  'peanuts',
  'eggs',
  'soy',
  'shellfish',
  'fish',
  'sesame',
  'mustard',
];

const AllergenSettingsModal = ({ onClose, onSave }) => {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllergens = async () => {
      try {
        const data = await api.getAllergens();
        setSelected(data.allergens || []);
      } catch (err) {
        console.error('Failed to fetch allergens:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllergens();
  }, []);

  const toggleAllergen = (allergen) => {
    setSelected((current) =>
      current.includes(allergen)
        ? current.filter((a) => a !== allergen)
        : [...current, allergen]
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.setAllergens(selected);
      toast.success('Allergens updated');
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not update allergens');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">Allergens & Intolerances</h3>
        <div className="modal-form">
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Select allergens you want to be warned about when logging food
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {COMMON_ALLERGENS.map((allergen) => (
              <label
                key={allergen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: selected.includes(allergen) ? 'rgba(var(--accent-primary-rgb), 0.12)' : 'var(--bg-elevated)',
                  border: selected.includes(allergen) ? '2px solid var(--accent-lime)' : '2px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(allergen)}
                  onChange={() => toggleAllergen(allergen)}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.95rem', textTransform: 'capitalize' }}>
                  {allergen}
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Allergens'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllergenSettingsModal;
