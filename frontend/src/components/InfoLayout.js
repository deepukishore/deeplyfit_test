import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/infoPages.css';

const InfoLayout = ({ title, eyebrow, intro, children, centered = false }) => {
  const navigate = useNavigate();
  return (
    <main className={`page-content info-page ${centered ? 'info-page-centered' : ''}`}>
      <header className="info-header">
        <button type="button" className="info-back" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={19} />
        </button>
        <h1>{title}</h1>
        <span className="info-header-spacer" aria-hidden="true" />
      </header>
      <div className="info-content">
        {(eyebrow || intro) && (
          <section className="info-hero">
            {eyebrow && <p className="info-eyebrow">{eyebrow}</p>}
            {intro && <p className="info-intro">{intro}</p>}
          </section>
        )}
        {children}
      </div>
    </main>
  );
};

export const InfoSection = ({ title, children }) => (
  <section className="info-card">
    <h2>{title}</h2>
    {children}
  </section>
);

export const InfoBullets = ({ items }) => (
  <ul className="info-bullets">
    {items.map((item) => <li key={item}>{item}</li>)}
  </ul>
);

export const InfoLink = ({ icon, title, detail, to }) => {
  const navigate = useNavigate();
  return (
    <button type="button" className="info-link-row" onClick={() => navigate(to)}>
      <span className="info-link-icon" aria-hidden="true">{icon}</span>
      <span className="info-link-copy"><strong>{title}</strong>{detail && <small>{detail}</small>}</span>
      <span className="info-link-arrow" aria-hidden="true">›</span>
    </button>
  );
};

export default InfoLayout;
