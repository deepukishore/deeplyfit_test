import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Camera,
  Check,
  Droplets,
  Dumbbell,
  Play,
  Sparkles,
  Star,
  Utensils,
  Zap,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import '../styles/landing.css';

const FEATURES = [
  {
    icon: Camera,
    number: '01',
    title: 'AI Food Scanner',
    copy: 'Photograph your meal. Get instant nutrition facts with far less manual entry.',
    accent: 'lime',
  },
  {
    icon: Bot,
    number: '02',
    title: 'AI Personal Coach',
    copy: 'Chat with a coach that can reason over your nutrition, weight, and workout data.',
    accent: 'amber',
  },
  {
    icon: BarChart3,
    number: '03',
    title: 'Smart Analytics',
    copy: 'See your patterns, understand your body, and make better decisions every day.',
    accent: 'blue',
  },
];

const Landing = () => {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      <header className="landing-hero">
        <nav className="landing-nav" aria-label="Public navigation">
          <Link className="landing-brand" to="/">
            <BrandLogo className="landing-brand-logo" alt="" />
            Deeplyfit
          </Link>
          <div className="landing-nav-links">
            <Link to="/about">About</Link>
            <Link to="/download">Android</Link>
            <Link className="landing-nav-login" to="/login">Sign in</Link>
          </div>
        </nav>

        <div className="landing-aurora" aria-hidden="true" />
        <div className="landing-hero-grid" aria-hidden="true" />

        <div className="landing-hero-copy animate-page-enter">
          <p className="landing-eyebrow"><Sparkles size={15} /> AI-powered fitness intelligence</p>
          <h1>Deeplyfit</h1>
          <p className="landing-promise">Your fitness. <span>Intelligently deep.</span></p>
          <p className="landing-subheadline">
            Tracking that learns you, coaches you, and turns everyday choices into visible progress.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-btn landing-btn-primary" to="/login">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <button className="landing-btn landing-btn-secondary" type="button" onClick={scrollToFeatures}>
              <Play size={17} fill="currentColor" /> See the App
            </button>
          </div>
          <div className="landing-trust-row">
            <span><Check size={14} /> Free to start</span>
            <span><Check size={14} /> Android ready</span>
            <span><Check size={14} /> Personalized goals</span>
          </div>
        </div>

        <div className="landing-product-scene" aria-label="Deeplyfit Android diary preview">
          <div className="landing-phone">
            <div className="landing-phone-speaker" />
            <img src="/deeply-fit-android-diary.png" alt="Deeplyfit food diary running on Android" />
          </div>
          <div className="landing-float-stat landing-stat-calories"><Utensils size={16} /><span><strong>1,247</strong> kcal left</span></div>
          <div className="landing-float-stat landing-stat-protein"><Dumbbell size={16} /><span>Protein <strong>94%</strong></span></div>
          <div className="landing-float-stat landing-stat-water"><Droplets size={16} /><span><strong>6/8</strong> glasses</span></div>
        </div>

        <div className="landing-scroll-cue" aria-hidden="true"><span /></div>
      </header>

      <main>
        <section className="landing-features" id="features">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Built around your real life</p>
            <h2>Less logging. More understanding.</h2>
            <p>One focused system for food, training, recovery, and the questions between them.</p>
          </div>
          <div className="landing-feature-grid">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className={`landing-feature landing-feature-${feature.accent}`} key={feature.title}>
                  <div className="landing-feature-top">
                    <span className="landing-feature-icon"><Icon size={24} /></span>
                    <small>{feature.number}</small>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.copy}</p>
                  <Link to="/login" aria-label={`Try ${feature.title}`}><ArrowRight size={18} /></Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-proof">
          <div className="landing-proof-copy">
            <p className="landing-eyebrow">A stronger daily rhythm</p>
            <h2>Join 10,000+ people already training with Deeplyfit.</h2>
          </div>
          <div className="landing-proof-rating">
            <div className="landing-avatars" aria-label="Deeplyfit community">
              {['DK', 'DS', 'AJ', 'RM', 'SK'].map((initials) => (
                <span key={initials}>{initials}</span>
              ))}
            </div>
            <div>
              <span className="landing-stars" aria-label="Five stars">
                {[0, 1, 2, 3, 4].map((star) => <Star key={star} size={16} fill="currentColor" />)}
              </span>
              <strong>4.9 / 5</strong>
              <small>from early members</small>
            </div>
          </div>
        </section>

        <section className="landing-cta">
          <Zap className="landing-cta-mark" size={110} fill="currentColor" aria-hidden="true" />
          <div>
            <p>Ready to go deeper?</p>
            <h2>Build the fitness system that finally fits you.</h2>
          </div>
          <Link className="landing-btn landing-btn-dark" to="/login">
            Start for Free <ArrowRight size={18} />
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Link className="landing-brand" to="/"><BrandLogo className="landing-brand-logo" alt="" />Deeplyfit</Link>
          <p>Intelligently deep. Deeply fit.</p>
        </div>
        <nav className="landing-footer-links" aria-label="Footer navigation">
          <Link to="/about">About</Link>
          <Link to="/download">Download</Link>
          <Link to="/about#privacy">Privacy</Link>
          <a href="mailto:deepu004.dk@gmail.com">Contact</a>
        </nav>
        <div className="landing-footer-meta">
          <p>Built by Deepthi, Co-Founder &amp; CEO, and Deepu, Co-Founder &amp; CTO.</p>
          <div>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">IG</a>
            <a href="https://x.com/" target="_blank" rel="noreferrer" aria-label="X">X</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
