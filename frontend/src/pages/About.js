import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  ChartNoAxesCombined,
  HeartPulse,
  Lightbulb,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/about.css';
import '../styles/animations.css';

const CAPABILITIES = [
  {
    icon: Bot,
    title: 'Personal AI coach',
    copy: 'Guidance that can use your nutrition, workout, and progress history to keep answers relevant to your day.',
    tone: 'violet',
  },
  {
    icon: ScanLine,
    title: 'Faster food logging',
    copy: 'Search, scan, and quantity-aware nutrition tools reduce the friction between eating and keeping an accurate diary.',
    tone: 'blue',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Progress you can read',
    copy: 'Daily targets, macro trends, hydration, workouts, and weight history come together in one focused view.',
    tone: 'amber',
  },
];

const TEAM = [
  {
    name: 'Deepthi',
    role: 'Founder',
    focus: 'Vision, product, and fitness intelligence',
    initials: 'D',
    copy: 'The founder shaped Deeply Fit around a simple idea: useful fitness technology should understand real routines, make daily tracking easier, and help people act on their own data with confidence.',
  },
  {
    name: 'Deepu Kishore',
    role: 'Co-founder',
    focus: 'Experience, community, and platform',
    initials: 'DK',
    copy: 'The co-founder helps turn that vision into a dependable experience, connecting thoughtful design, practical tools, and a community layer that keeps progress human and motivating.',
  },
];

const PRINCIPLES = [
  { icon: Target, title: 'Practical first', copy: 'Every feature should help with a real daily decision.' },
  { icon: ShieldCheck, title: 'Trust by design', copy: 'Health data deserves clear controls and responsible handling.' },
  { icon: Lightbulb, title: 'Progress over perfection', copy: 'Small, repeatable actions matter more than flawless days.' },
];

const About = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <main className={`page-content about-page page-enter ${!user ? 'about-page-public' : ''}`}>
      {!user && (
        <nav className="about-public-nav" aria-label="About page navigation">
          <button type="button" className="about-public-brand" onClick={() => navigate('/')}>
            <span><Zap size={17} fill="currentColor" /></span> Deeply Fit
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/login')}>Sign in</button>
        </nav>
      )}
      <header className="about-hero">
        <div className="about-hero-copy">
          <div className="about-kicker"><Sparkles size={15} /> Intelligently deep. Deeply fit.</div>
          <h1>Deeply Fit</h1>
          <p className="about-hero-lead">
            A clearer way to understand what you eat, how you move, and where your routine is taking you.
            Deeply Fit brings intelligent coaching and everyday tracking into one calm fitness workspace.
          </p>
          <div className="about-hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate('/home')}>
              Open dashboard <ArrowRight size={17} />
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/ai')}>
              Meet the AI coach <Bot size={17} />
            </button>
          </div>
        </div>

        <div className="about-hero-visual" aria-label="Deeply Fit product highlights">
          <div className="about-orbit about-orbit-one" />
          <div className="about-orbit about-orbit-two" />
          <div className="about-core-mark"><HeartPulse size={38} strokeWidth={1.8} /></div>
          <div className="about-signal about-signal-ai"><Bot size={16} /> Personal coaching</div>
          <div className="about-signal about-signal-log"><ScanLine size={16} /> Smart logging</div>
          <div className="about-signal about-signal-progress"><ChartNoAxesCombined size={16} /> Clear progress</div>
        </div>
      </header>

      <section className="about-story about-section">
        <div className="about-section-heading">
          <span>Why we built it</span>
          <h2>Fitness data should feel useful, not overwhelming.</h2>
        </div>
        <div className="about-story-copy">
          <p>
            Deeply Fit was created to close the gap between collecting health data and knowing what to do with it.
            The app combines a daily food diary, workout planning, hydration, progress tracking, community, and an
            AI coach in one connected experience.
          </p>
          <p>
            The website is designed as the focused desktop companion to the mobile app: roomy enough for trends and
            planning, fast enough for daily logging, and consistent across light and dark modes.
          </p>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-capabilities-title">
        <div className="about-section-heading compact">
          <span>One connected system</span>
          <h2 id="about-capabilities-title">Built around your real routine</h2>
        </div>
        <div className="about-capability-grid stagger">
          {CAPABILITIES.map(({ icon: Icon, title, copy, tone }) => (
            <article className={`about-capability about-tone-${tone} animate-slide-up`} key={title}>
              <div className="about-icon"><Icon size={23} /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-team about-section" aria-labelledby="about-team-title">
        <div className="about-section-heading compact">
          <span>The people behind the product</span>
          <h2 id="about-team-title">Founder and co-founder</h2>
        </div>
        <div className="about-team-grid">
          {TEAM.map((member) => (
            <article className="about-person" key={member.role}>
              <div className="about-person-avatar">{member.initials}</div>
              <div className="about-person-copy">
                <div className="about-person-role"><Users size={16} /> {member.role}</div>
                <h3>{member.name}</h3>
                <p className="about-person-focus">{member.focus}</p>
                <p>{member.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-principles about-section" aria-labelledby="about-principles-title">
        <div className="about-section-heading compact">
          <span>How we work</span>
          <h2 id="about-principles-title">Principles behind Deeply Fit</h2>
        </div>
        <div className="about-principle-grid">
          {PRINCIPLES.map(({ icon: Icon, title, copy }) => (
            <div className="about-principle" key={title}>
              <Icon size={21} />
              <div><h3>{title}</h3><p>{copy}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-cta">
        <div>
          <span>Made for steady progress</span>
          <h2>Your next useful action is already waiting.</h2>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/diary')}>
          Log today <ArrowRight size={17} />
        </button>
      </section>
    </main>
  );
};

export default About;
