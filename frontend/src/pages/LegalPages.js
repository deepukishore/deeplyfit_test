import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import InfoLayout, { InfoBullets, InfoLink, InfoSection } from '../components/InfoLayout';

export const POLICY_DOCUMENTS = {
  privacy: {
    title: 'Privacy Policy', icon: 'PR', path: '/privacy-policy', detail: 'How we collect, use, and protect your data',
    intro: 'Your fitness journey is personal. This policy explains what Deeply Fit collects, why we use it, and the choices you have.',
    sections: [
      ['Information we collect', ['Account details such as your name, email, profile settings, and authentication information.', 'Health and activity information you choose to add, including meals, workouts, weight, goals, progress, and coach conversations.', 'Device, diagnostics, and usage information needed to operate, secure, and improve the service.']],
      ['How we use information', ['Provide personalized tracking, insights, recommendations, and community features.', 'Keep the service reliable, prevent fraud and abuse, respond to support requests, and meet legal obligations.', 'Improve features using aggregated or de-identified information where appropriate. We do not sell your personal information.']],
      ['Sharing and retention', ['We share information with service providers only as needed to run Deeply Fit, or when required by law. Public profile and community information is visible according to the choices you make.', 'We retain information while your account is active and as reasonably necessary for security, dispute resolution, and legal compliance.']],
      ['Your choices', ['You can edit profile and privacy settings, manage cookies, request access or correction, and ask us to delete or export eligible information.', 'Contact privacy@deeplyfit.app for privacy requests. We may verify your identity before completing a request.']],
    ],
  },
  terms: {
    title: 'Terms of Service', icon: 'TO', path: '/terms', detail: 'The rules governing your use of Deeply Fit',
    intro: 'These terms form an agreement between you and Deeply Fit when you create an account or use our services.',
    sections: [
      ['Using Deeply Fit', ['You must provide accurate account information, protect your credentials, and be legally able to accept these terms.', 'Use the service only for lawful, personal purposes and follow the Acceptable Use Policy and Community Guidelines.']],
      ['Health information', ['Deeply Fit offers general fitness and nutrition tools, not medical care. Outputs may be incomplete or inaccurate and must not replace professional judgment.', 'Stop exercising and seek qualified help if you have symptoms or concerns.']],
      ['Subscriptions and cancellation', ['Paid plans renew as disclosed at purchase unless cancelled through the original purchase channel. Access continues through the paid period unless local law requires otherwise.', 'Prices, taxes, trials, refund eligibility, and billing terms are shown before purchase.']],
      ['Content and service changes', ['You keep ownership of content you submit and grant us the limited permission needed to host, process, and display it for the service.', 'We may update or discontinue features, suspend misuse, or terminate accounts that materially breach these terms.']],
      ['Liability and disputes', ['The service is provided on an as-available basis to the extent permitted by law. Mandatory consumer protections remain in effect.', 'Contact legal@deeplyfit.app first so we can try to resolve a concern informally.']],
    ],
  },
  cookies: {
    title: 'Cookie Policy', icon: 'CK', path: '/cookie-policy', detail: 'Cookies and similar technologies',
    intro: 'This policy describes cookies and similar local technologies used on Deeply Fit websites and app experiences.',
    sections: [
      ['What these technologies do', ['Strictly necessary storage keeps sessions secure, remembers privacy choices, and enables core features.', 'Preference storage remembers settings such as theme and language. Analytics helps us understand performance and improve the product.', 'Marketing technologies, if offered, measure campaigns and are disabled unless you choose them where consent is required.']],
      ['Your controls', ['Use Cookie Preferences to change optional categories at any time. Clearing browser storage may sign you out or reset preferences.', 'Blocking required storage may prevent secure or essential parts of the service from working.']],
      ['Retention and partners', ['Storage duration depends on purpose. Session technologies expire after use, while saved preferences may remain until changed or cleared.', 'When vendors assist with analytics or delivery, they may process limited device data under contractual safeguards.']],
    ],
  },
  cancellation: {
    title: 'Cancellation Policy', icon: 'CA', path: '/cancellation-policy', detail: 'Manage renewals, trials, and refunds',
    intro: 'You can cancel a paid plan at any time. Cancellation stops future renewal and does not delete your Deeply Fit account.',
    sections: [
      ['How to cancel', ['Cancel through the same channel used to subscribe, such as an app store or the Deeply Fit billing page.', 'Complete cancellation at least 24 hours before renewal to reduce the risk of the next charge being processed.']],
      ['After cancellation', ['Premium access normally remains available until the end of the current paid period. Your account then moves to the free plan.', 'Deleting the app or your account does not automatically cancel a store-managed subscription.']],
      ['Trials and refunds', ['Cancel before a free trial ends to avoid conversion to a paid plan.', 'Refunds are handled under the original purchase-channel rules and applicable consumer law. Contact support for incorrect or duplicate charges.']],
    ],
  },
  disclaimer: {
    title: 'Disclaimer', icon: '!', path: '/disclaimer', detail: 'Important limits on fitness and AI guidance',
    intro: 'Deeply Fit supports everyday wellness decisions, but it is not a healthcare provider or emergency service.',
    sections: [
      ['Not medical advice', ['Nutrition estimates, calorie targets, workout suggestions, AI responses, and community content are general information only.', 'They are not diagnoses, prescriptions, treatment plans, or substitutes for a qualified professional.']],
      ['Use your judgment', ['Results vary by person, food preparation, device accuracy, and data quality. Verify important information independently.', 'Consult a professional before significant changes, especially if pregnant, under 18, injured, or managing a medical condition.']],
      ['Emergencies', ['Do not use Deeply Fit for urgent or emergency needs. Contact local emergency services if you believe you may be in danger.']],
    ],
  },
  accessibility: {
    title: 'Accessibility Statement', icon: 'AX', path: '/accessibility', detail: 'Our commitment to inclusive access',
    intro: 'We want Deeply Fit to be useful to as many people as possible, across abilities, devices, and ways of interacting.',
    sections: [
      ['Our approach', ['We aim to support screen readers, meaningful labels, scalable text, adequate contrast, keyboard navigation, and reduced-motion preferences.', 'Accessibility is included in design, engineering review, and ongoing product improvement.']],
      ['Known limitations', ['Some third-party payment, charting, camera, or authentication experiences may not yet meet the same standard.', 'AI-generated or community content can occasionally lack ideal descriptions or structure.']],
      ['Feedback', ['Email accessibility@deeplyfit.app with the page, device, assistive technology, and issue encountered.', 'We will acknowledge feedback and work toward a practical resolution. Alternative formats are available where reasonably possible.']],
    ],
  },
  dpa: {
    title: 'Data Processing Agreement', icon: 'DP', path: '/data-processing-agreement', detail: 'Controller and processor commitments',
    intro: 'This DPA applies when a business customer uses Deeply Fit to process personal data on its behalf and incorporates the applicable service agreement.',
    sections: [
      ['Roles and instructions', ['The customer is the controller and Deeply Fit is the processor for customer personal data, except where each acts independently under applicable law.', 'We process data only on documented instructions to provide, secure, support, and improve the contracted service.']],
      ['Security and confidentiality', ['Personnel and subprocessors with access are bound by confidentiality obligations and access controls.', 'We maintain proportionate measures including encryption in transit, credential safeguards, monitoring, backups, and incident procedures.']],
      ['Subprocessors and transfers', ['We may use vetted subprocessors for infrastructure, communications, analytics, and support, and remain responsible for relevant obligations.', 'Cross-border transfers use a lawful transfer mechanism where required. Customers may request the current subprocessor list.']],
      ['Assistance and deletion', ['We provide reasonable help with data-subject requests, assessments, regulatory inquiries, and breach notification.', 'At the end of service, customer personal data is returned or deleted on request unless retention is legally required.']],
      ['Execution', ['To execute a signed DPA, including appropriate transfer clauses and a processing annex, contact legal@deeplyfit.app.']],
    ],
  },
  acceptableUse: {
    title: 'Acceptable Use Policy', icon: 'AU', path: '/acceptable-use-policy', detail: 'Safe and lawful use of the service',
    intro: 'These rules protect Deeply Fit members, our systems, and the broader community.',
    sections: [
      ['Do not misuse the service', ['Do not break laws, violate intellectual-property or privacy rights, impersonate others, or submit deceptive or harmful material.', 'Do not probe, bypass, disrupt, reverse engineer, scrape at scale, introduce malware, or access systems without authorization.']],
      ['Protect people', ['Do not threaten, harass, exploit, discriminate against, or promote harm toward any person or group.', 'Do not encourage eating disorders, dangerous challenges, self-harm, illicit drug use, or unsafe training practices.']],
      ['Enforcement', ['We may remove content, limit features, preserve evidence, or suspend accounts based on severity, history, and risk.', 'Report violations through Support. Good-faith security research should follow Responsible Disclosure.']],
    ],
  },
  security: {
    title: 'Security Policy', icon: 'SE', path: '/security', detail: 'How we safeguard Deeply Fit',
    intro: 'Security is a shared responsibility. We use layered safeguards and continuously improve them as the service evolves.',
    sections: [
      ['Platform safeguards', ['We use transport encryption, access controls, secure authentication practices, dependency review, logging, monitoring, and backups appropriate to the service.', 'Access to production and customer information is limited by role and operational need.']],
      ['Your responsibilities', ['Use a unique password, keep your device and email secure, sign out of shared devices, and report suspicious access promptly.', 'Never share verification codes or credentials with anyone claiming to be Deeply Fit support.']],
      ['Incidents and reporting', ['We investigate suspected incidents, contain impact, preserve relevant records, and notify affected parties when legally required.', 'Security researchers should use Responsible Disclosure rather than publicizing an unresolved issue.']],
    ],
  },
  disclosure: {
    title: 'Responsible Disclosure', icon: 'RD', path: '/responsible-disclosure', detail: 'Report a security vulnerability safely',
    intro: 'We welcome good-faith reports that help keep Deeply Fit and its members safe.',
    sections: [
      ['How to report', ['Email security@deeplyfit.app with a clear description, affected surface, reproduction steps, impact, and supporting evidence.', 'Do not include personal data that is not necessary to explain the issue.']],
      ['Research guidelines', ['Use only accounts and data you own or have explicit permission to test. Stop if you encounter another person’s data.', 'Do not use social engineering, denial of service, spam, physical attacks, destructive testing, or data exfiltration.']],
      ['Our commitment', ['We will investigate in good faith, keep you informed at reasonable intervals, and work toward remediation based on severity.', 'We will not pursue legal action for accidental, good-faith research that follows this policy. Coordinate disclosure timing with us.']],
    ],
  },
  community: {
    title: 'Community Guidelines', icon: 'CG', path: '/community-guidelines', detail: 'A constructive space for every member',
    intro: 'Deeply Fit is for encouragement, useful knowledge, and honest progress—not pressure or perfection.',
    sections: [
      ['Be supportive', ['Treat people with dignity. Respect different bodies, abilities, cultures, goals, and experience levels.', 'Offer personal experience as personal experience, not a guaranteed result or professional diagnosis.']],
      ['Keep it safe', ['Do not post harassment, hate, exploitation, graphic violence, self-harm encouragement, dangerous challenges, or eating-disorder promotion.', 'Do not share someone else’s personal information, messages, images, or health data without permission.']],
      ['Keep it authentic', ['Do not spam, manipulate engagement, impersonate others, or promote misleading products, transformations, or health claims.', 'Disclose commercial relationships and respect content ownership.']],
      ['Moderation', ['Members can report content or block accounts. We may reduce distribution, remove content, restrict features, or suspend accounts.', 'Contact Support if you believe a moderation decision should be reviewed.']],
    ],
  },
};

export const PolicyPage = ({ documentKey }) => {
  const document = POLICY_DOCUMENTS[documentKey];
  return (
    <InfoLayout title={document.title} eyebrow="Last updated August 21, 2026" intro={document.intro}>
      {document.sections.map(([title, items]) => <InfoSection title={title} key={title}><InfoBullets items={items} /></InfoSection>)}
      <p className="info-footer-note">Questions? Contact support@deeplyfit.app. This website copy is the current product policy summary.</p>
    </InfoLayout>
  );
};

export const LegalCenter = () => (
  <InfoLayout title="Legal & policies" eyebrow="Transparency center" intro="Find the policies, commitments, and controls that govern your Deeply Fit experience.">
    <div className="info-link-list">
      {Object.values(POLICY_DOCUMENTS).map((document) => <InfoLink key={document.path} {...document} to={document.path} />)}
      <InfoLink icon="CP" title="Cookie Preferences" detail="Choose which optional technologies can be used" to="/cookie-preferences" />
    </div>
  </InfoLayout>
);

const FAQS = [
  ['How do I change my goals?', 'Open Profile, choose Goals, public profile, and privacy, update your goals, and save.'],
  ['Can I use the diary offline?', 'Yes. Recently cached diary information remains available, and supported changes sync when your connection returns.'],
  ['How do I cancel PRO?', 'Open Profile, choose Manage PRO, review the downgrade details, and confirm cancellation. Access continues through the paid period.'],
  ['Are AI coach answers medical advice?', 'No. AI coaching is general wellness information and does not replace a qualified professional.'],
  ['How do public profiles work?', 'You control profile visibility and achievement sharing from Profile settings. Review them before sharing your public link.'],
  ['How do I report a community post?', 'Use the report option on the post or contact Support with enough detail for our team to locate it.'],
];

export const HelpCenter = () => {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return FAQS.filter(([question, answer]) => !term || `${question} ${answer}`.toLowerCase().includes(term));
  }, [query]);
  return (
    <InfoLayout title="Help Center" eyebrow="Answers, right when you need them" intro="Search common questions or jump to a support resource.">
      <input className="info-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help" aria-label="Search Help Center" />
      {results.length ? results.map(([question, answer]) => <InfoSection title={question} key={question}><p>{answer}</p></InfoSection>) : (
        <InfoSection title="No help articles found"><p>Try fewer words, or ask our support team.</p><div className="info-button-stack"><InfoLink icon="SP" title="Contact support" to="/support" /></div></InfoSection>
      )}
      <div className="info-link-list">
        <InfoLink icon="SP" title="Support" detail="Contact the team or report a problem" to="/support" />
        <InfoLink icon="LG" title="Legal & policies" detail="Privacy, terms, safety, and community rules" to="/legal" />
      </div>
    </InfoLayout>
  );
};

export const Support = () => (
  <InfoLayout title="Support" eyebrow="We are here to help" intro="Choose the fastest route for your question. Include your browser, device, and a short description for technical problems.">
    <div className="info-link-list">
      <a className="info-link-row" href="mailto:support@deeplyfit.app?subject=Deeply%20Fit%20support%20request"><span className="info-link-icon">EM</span><span className="info-link-copy"><strong>Email support</strong><small>support@deeplyfit.app</small></span><span className="info-link-arrow">›</span></a>
      <a className="info-link-row" href="mailto:support@deeplyfit.app?subject=Deeply%20Fit%20bug%20report"><span className="info-link-icon">BG</span><span className="info-link-copy"><strong>Report a bug</strong><small>Tell us what happened and how to reproduce it</small></span><span className="info-link-arrow">›</span></a>
      <InfoLink icon="SE" title="Report a security issue" detail="Use our responsible disclosure process" to="/responsible-disclosure" />
      <InfoLink icon="HC" title="Browse Help Center" detail="Answers to common product questions" to="/help" />
    </div>
    <InfoSection title="Before you contact us"><p>Never email your password, verification codes, payment-card details, or sensitive medical records. Deeply Fit support will not ask for your password.</p></InfoSection>
    <p className="info-footer-note">Typical response target: 1–2 business days. Direct urgent medical or safety situations to local emergency services.</p>
  </InfoLayout>
);

const COOKIE_KEY = 'deeply_fit_cookie_preferences_v1';
const COOKIE_DEFAULTS = { necessary: true, preferences: true, analytics: false, marketing: false };
const COOKIE_OPTIONS = [
  ['necessary', 'Strictly necessary', 'Required for secure sign-in, fraud prevention, and core service operation.'],
  ['preferences', 'Preferences', 'Remembers settings such as theme, language, and interface choices.'],
  ['analytics', 'Analytics', 'Helps us measure reliability and understand how features are used.'],
  ['marketing', 'Marketing', 'Measures campaigns and enables relevant promotions where offered.'],
];

const readCookies = () => {
  try { return { ...COOKIE_DEFAULTS, ...JSON.parse(localStorage.getItem(COOKIE_KEY) || '{}'), necessary: true }; }
  catch { return COOKIE_DEFAULTS; }
};

export const CookiePreferences = () => {
  const [values, setValues] = useState(readCookies);
  const save = (next = values) => {
    const payload = { ...next, necessary: true, updatedAt: new Date().toISOString() };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(payload));
    setValues(payload);
    toast.success('Cookie preferences saved');
  };
  const reject = () => save({ necessary: true, preferences: false, analytics: false, marketing: false });
  return (
    <InfoLayout title="Cookie Preferences" eyebrow="Your privacy controls" intro="Choose which optional technologies Deeply Fit may use. Necessary technologies stay on because the service cannot work securely without them.">
      <div className="info-link-list">
        {COOKIE_OPTIONS.map(([key, title, detail]) => (
          <div className="cookie-option" key={key}>
            <div><strong>{title}</strong><p>{detail}</p></div>
            <button type="button" className={`cookie-switch ${values[key] ? 'on' : ''}`} onClick={() => setValues((current) => ({ ...current, [key]: !current[key] }))} disabled={key === 'necessary'} aria-label={`${title} cookies`} aria-pressed={values[key]} />
          </div>
        ))}
      </div>
      <div className="info-button-stack">
        <button type="button" className="btn btn-primary btn-full" onClick={() => save()}>Save preferences</button>
        <button type="button" className="btn btn-secondary btn-full" onClick={reject}>Reject optional cookies</button>
      </div>
      <p className="info-footer-note">These choices apply to this browser. Clearing browser storage may reset them.</p>
    </InfoLayout>
  );
};
