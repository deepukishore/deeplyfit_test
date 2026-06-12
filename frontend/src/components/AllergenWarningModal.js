import React from 'react';
import '../styles/dashboard.css';

const AllergenWarningModal = ({ foodName, allergens, onLogAnyway, onCancel }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">⚠️ Allergen Alert</h3>
        <div className="modal-form">
          <p style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <strong>{foodName}</strong> contains the following allergens you marked:
          </p>
          <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {allergens.map((allergen) => (
              <div key={allergen} style={{ padding: '0.5rem 0', fontSize: '0.95rem' }}>
                ✓ {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={onLogAnyway} style={{ flex: 1 }}>
              Log Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllergenWarningModal;
