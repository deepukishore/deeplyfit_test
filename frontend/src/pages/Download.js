import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  ChartNoAxesCombined,
  CircleCheck,
  Download as DownloadIcon,
  ScanLine,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import '../styles/download.css';
import '../styles/animations.css';

const APK_URL = process.env.REACT_APP_APK_DOWNLOAD_URL?.trim() || '/downloads/deeply-fit.apk';
const APK_FILENAME = process.env.REACT_APP_APK_FILE_NAME?.trim() || 'deeply-fit.apk';

const MOBILE_FEATURES = [
  {
    icon: ScanLine,
    title: 'Log food in less time',
    copy: 'Search foods, scan a meal, choose a quantity, and keep calories and macros connected to your diary.',
  },
  {
    icon: Bot,
    title: 'Take your AI coach with you',
    copy: 'Ask for practical support using the nutrition, workout, and progress data already in your account.',
  },
  {
    icon: WifiOff,
    title: 'Keep your diary available',
    copy: 'Cached diary data and queued food logs make everyday tracking more resilient when the network is slow.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'See the full picture',
    copy: 'Review daily targets, hydration, workouts, weight, and progress from one focused mobile experience.',
  },
];

const DownloadButton = ({ className = '' }) => (
  <a
    className={`btn btn-primary download-apk-button ${className}`.trim()}
    href={APK_URL}
    download={APK_FILENAME}
    aria-label="Download Deeply Fit for Android"
  >
    <DownloadIcon size={18} /> Download Android APK
  </a>
);

const Download = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <main className={`page-content download-page page-enter ${!user ? 'download-page-public' : ''}`}>
      {!user && (
        <nav className="download-public-nav" aria-label="Download page navigation">
          <button type="button" className="download-public-brand" onClick={() => navigate('/')}>
            <BrandLogo className="public-brand-logo" alt="" /> Deeply Fit
          </button>
          <div className="download-public-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/about')}>About</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/login')}>Sign in</button>
          </div>
        </nav>
      )}

      <header className="download-hero">
        <div className="download-hero-copy">
          <div className="download-kicker"><Smartphone size={15} /> Deeply Fit on Android</div>
          <h1>Deeply Fit for Android</h1>
          <p className="download-hero-lead">
            Carry your food diary, AI coach, workouts, hydration, and progress wherever your routine takes you.
            Sign in with the same account you use on the website and keep your day connected.
          </p>
          <div className="download-hero-actions">
            <DownloadButton />
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/about')}>
              Explore Deeply Fit <ArrowRight size={17} />
            </button>
          </div>
          <div className="download-trust-row" aria-label="Android app highlights">
            <span><CircleCheck size={15} /> Direct APK</span>
            <span><CircleCheck size={15} /> Shared account</span>
            <span><CircleCheck size={15} /> Mobile-first tracking</span>
          </div>
        </div>

        <div className="download-device-stage" aria-label="Deeply Fit Android food diary preview">
          <div className="download-device-shadow" />
          <div className="download-phone">
            <div className="download-phone-speaker" />
            <img src="/deeply-fit-android-diary.png" alt="Deeply Fit food diary on Android" />
          </div>
          <div className="download-device-note download-device-note-top"><ScanLine size={16} /> Search and scan</div>
          <div className="download-device-note download-device-note-bottom"><WifiOff size={16} /> Offline-ready diary</div>
        </div>
      </header>

      <section className="download-overview" aria-labelledby="download-overview-title">
        <div className="download-section-heading">
          <span>Made for movement</span>
          <h2 id="download-overview-title">Built for the moments away from your desk</h2>
        </div>
        <div className="download-feature-list">
          {MOBILE_FEATURES.map(({ icon: Icon, title, copy }, index) => (
            <article className="download-feature" key={title}>
              <div className="download-feature-number">0{index + 1}</div>
              <div className="download-feature-icon"><Icon size={21} /></div>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="download-account-band" aria-label="Deeply Fit account information">
        <div className="download-account-mark"><ShieldCheck size={27} /></div>
        <div>
          <span>One Deeply Fit account</span>
          <h2>Move between the website and Android app without starting over.</h2>
          <p>Your profile, targets, diary, workouts, and progress stay connected through the same secure account.</p>
        </div>
      </section>

      <section className="download-final-cta">
        <div>
          <span>Android APK</span>
          <h2>Your fitness workspace, now in your pocket.</h2>
          <p>Download the current Android build directly from Deeply Fit.</p>
        </div>
        <DownloadButton className="download-final-button" />
      </section>
    </main>
  );
};

export default Download;
