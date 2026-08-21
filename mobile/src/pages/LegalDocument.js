import React from 'react';
import InfoPageLayout, { InfoBullet, InfoParagraph, InfoSection } from '../components/InfoPageLayout';

export const LEGAL_DOCUMENTS = {
  PrivacyPolicy: {
    title: 'Privacy Policy', icon: 'PR', detail: 'How we collect, use, and protect your data',
    intro: 'Your fitness journey is personal. This policy explains what Deeply Fit collects, why we use it, and the choices you have.',
    sections: [
      ['Information we collect', ['Account details such as your name, email, profile settings, and authentication information.', 'Health and activity information you choose to add, including meals, workouts, weight, goals, progress, and coach conversations.', 'Device, diagnostics, and usage information needed to operate, secure, and improve the service.']],
      ['How we use information', ['Provide personalized tracking, insights, recommendations, and community features.', 'Keep the service reliable, prevent fraud and abuse, respond to support requests, and meet legal obligations.', 'Improve features using aggregated or de-identified information where appropriate. We do not sell your personal information.']],
      ['Sharing and retention', ['We share information with service providers only as needed to run Deeply Fit, or when required by law. Public profile and community information is visible according to the choices you make.', 'We retain information while your account is active and as reasonably necessary for security, dispute resolution, and legal compliance.']],
      ['Your choices', ['You can edit profile and privacy settings in the app, manage cookies, request access or correction, and ask us to delete or export eligible information.', 'Contact privacy@deeplyfit.app for privacy requests. We may verify your identity before completing a request.']],
    ],
  },
  TermsOfService: {
    title: 'Terms of Service', icon: 'TO', detail: 'The rules governing your use of Deeply Fit',
    intro: 'These terms form an agreement between you and Deeply Fit when you create an account or use our services.',
    sections: [
      ['Using Deeply Fit', ['You must provide accurate account information, protect your credentials, and be legally able to accept these terms.', 'Use the service only for lawful, personal purposes and follow the Acceptable Use Policy and Community Guidelines.']],
      ['Health information', ['Deeply Fit offers general fitness and nutrition tools, not medical care. Outputs may be incomplete or inaccurate and must not replace professional judgment.', 'Stop exercising and seek qualified help if you have symptoms or concerns.']],
      ['Subscriptions and cancellation', ['Paid plans renew as disclosed at purchase unless cancelled through the original purchase channel. Access continues through the paid period unless local law requires otherwise.', 'Prices, taxes, trials, refund eligibility, and billing terms are shown before purchase.']],
      ['Content and service changes', ['You keep ownership of content you submit and grant us the limited permission needed to host, process, and display it for the service.', 'We may update or discontinue features, suspend misuse, or terminate accounts that materially breach these terms.']],
      ['Liability and disputes', ['The service is provided on an as-available basis to the extent permitted by law. Nothing in these terms excludes rights or liabilities that cannot legally be excluded.', 'Contact legal@deeplyfit.app first so we can try to resolve a concern informally. Applicable mandatory consumer protections remain in effect.']],
    ],
  },
  CookiePolicy: {
    title: 'Cookie Policy', icon: 'CK', detail: 'Cookies and similar technologies',
    intro: 'This policy describes cookies and similar local technologies used on Deeply Fit websites and app experiences.',
    sections: [
      ['What these technologies do', ['Strictly necessary storage keeps sessions secure, remembers privacy choices, and enables core features.', 'Preference storage remembers settings such as theme and language. Analytics helps us understand performance and improve the product.', 'Marketing technologies, if offered, measure campaigns and are disabled unless you choose them where consent is required.']],
      ['Your controls', ['Use Cookie Preferences to change optional categories at any time. You can also clear browser or device storage, though doing so may sign you out or reset preferences.', 'Blocking required storage may prevent secure or essential parts of the service from working.']],
      ['Retention and partners', ['Storage duration depends on purpose: session technologies expire after use, while saved preferences may remain until changed or cleared.', 'When vendors assist with analytics or delivery, they may process limited device data under contractual safeguards.']],
    ],
  },
  CancellationPolicy: {
    title: 'Cancellation Policy', icon: 'CA', detail: 'Manage renewals, trials, and refunds',
    intro: 'You can cancel a paid plan at any time. Cancellation stops future renewal and does not delete your Deeply Fit account.',
    sections: [
      ['How to cancel', ['Cancel through the same channel used to subscribe, such as Apple App Store, Google Play, or the Deeply Fit billing portal.', 'Complete cancellation at least 24 hours before renewal to reduce the risk of the store processing the next charge.']],
      ['After cancellation', ['Premium access normally remains available until the end of the current paid period. Your account then moves to the free plan.', 'Deleting the app or your account does not automatically cancel a store-managed subscription.']],
      ['Trials and refunds', ['Cancel before a free trial ends to avoid conversion to a paid plan. Trial availability and duration are shown at signup.', 'Refunds are handled under the original store rules and applicable consumer law. Contact support if a charge appears incorrect or duplicated.']],
    ],
  },
  Disclaimer: {
    title: 'Disclaimer', icon: '!', detail: 'Important limits on fitness and AI guidance',
    intro: 'Deeply Fit supports everyday wellness decisions, but it is not a healthcare provider or emergency service.',
    sections: [
      ['Not medical advice', ['Nutrition estimates, calorie targets, workout suggestions, AI responses, and community content are general information only.', 'They are not diagnoses, prescriptions, treatment plans, or substitutes for a doctor, dietitian, or other qualified professional.']],
      ['Use your judgment', ['Results vary by person, food preparation, device accuracy, and data quality. Verify important information independently.', 'Consult a professional before significant diet or exercise changes, especially if pregnant, under 18, injured, or managing a medical condition.']],
      ['Emergencies', ['Do not use Deeply Fit for urgent or emergency needs. Contact local emergency services if you believe you may be in danger.']],
    ],
  },
  AccessibilityStatement: {
    title: 'Accessibility Statement', icon: 'AX', detail: 'Our commitment to inclusive access',
    intro: 'We want Deeply Fit to be useful to as many people as possible, across abilities, devices, and ways of interacting.',
    sections: [
      ['Our approach', ['We aim to support screen readers, meaningful labels, scalable text, adequate contrast, keyboard-friendly web navigation, and reduced-motion preferences.', 'Accessibility is included in design, engineering review, and ongoing product improvement.']],
      ['Known limitations', ['Some third-party payment, charting, camera, or authentication experiences may not yet meet the same standard.', 'Rapidly changing AI-generated or community content can occasionally lack ideal descriptions or structure.']],
      ['Feedback', ['Email accessibility@deeplyfit.app with the screen, device, assistive technology, and issue encountered.', 'We will acknowledge feedback and work toward a practical resolution. Alternative formats are available on request where reasonably possible.']],
    ],
  },
  DataProcessingAgreement: {
    title: 'Data Processing Agreement', icon: 'DP', detail: 'Controller and processor commitments',
    intro: 'This DPA applies when a business customer uses Deeply Fit to process personal data on its behalf and incorporates the applicable service agreement.',
    sections: [
      ['Roles and instructions', ['The customer is the controller and Deeply Fit is the processor for customer personal data, except where each acts independently under applicable law.', 'We process data only on documented instructions, including to provide, secure, support, and improve the contracted service.']],
      ['Security and confidentiality', ['Personnel and subprocessors with access are bound by confidentiality obligations and access controls.', 'We maintain proportionate technical and organizational measures, including encryption in transit, credential safeguards, monitoring, backups, and incident procedures.']],
      ['Subprocessors and transfers', ['We may use vetted subprocessors to provide infrastructure, communications, analytics, and support. We remain responsible for their relevant obligations.', 'Cross-border transfers use a lawful transfer mechanism where required. Customers may request the current subprocessor list.']],
      ['Assistance and deletion', ['We provide reasonable help with data-subject requests, impact assessments, regulatory inquiries, and breach notification, taking into account the nature of processing.', 'At the end of service, customer personal data is returned or deleted on request unless retention is legally required.']],
      ['Execution', ['To execute a signed DPA, including appropriate transfer clauses and an annex describing your processing, contact legal@deeplyfit.app.']],
    ],
  },
  AcceptableUsePolicy: {
    title: 'Acceptable Use Policy', icon: 'AU', detail: 'Safe and lawful use of the service',
    intro: 'These rules protect Deeply Fit members, our systems, and the broader community.',
    sections: [
      ['Do not misuse the service', ['Do not break laws, violate intellectual-property or privacy rights, impersonate others, or submit deceptive or harmful material.', 'Do not probe, bypass, disrupt, reverse engineer, scrape at scale, introduce malware, or access accounts or systems without authorization.']],
      ['Protect people', ['Do not threaten, harass, exploit, discriminate against, or promote harm toward any person or group.', 'Do not encourage eating disorders, dangerous challenges, self-harm, illicit drug use, or unsafe training practices.']],
      ['Enforcement', ['We may remove content, limit features, preserve evidence, or suspend accounts based on severity, history, and risk.', 'Report suspected violations through Support. Good-faith security research should follow Responsible Disclosure.']],
    ],
  },
  SecurityPolicy: {
    title: 'Security Policy', icon: 'SE', detail: 'How we safeguard Deeply Fit',
    intro: 'Security is a shared responsibility. We use layered safeguards and continuously improve them as the service evolves.',
    sections: [
      ['Platform safeguards', ['We use transport encryption, access controls, secure authentication practices, dependency review, logging, monitoring, and backup procedures appropriate to the service.', 'Access to production and customer information is limited by role and operational need.']],
      ['Your responsibilities', ['Use a unique password, keep your device and email secure, sign out of shared devices, and report suspicious access promptly.', 'Never share verification codes or credentials with anyone claiming to be Deeply Fit support.']],
      ['Incidents and reporting', ['We investigate suspected incidents, contain impact, preserve relevant records, and notify affected parties when legally required.', 'Security researchers should use the Responsible Disclosure process rather than publicizing an unresolved issue.']],
    ],
  },
  ResponsibleDisclosure: {
    title: 'Responsible Disclosure', icon: 'RD', detail: 'Report a security vulnerability safely',
    intro: 'We welcome good-faith reports that help keep Deeply Fit and its members safe.',
    sections: [
      ['How to report', ['Email security@deeplyfit.app with a clear description, affected surface, reproduction steps, impact, and supporting screenshots or logs.', 'Do not include personal data that is not necessary to explain the issue. We will acknowledge a complete report as soon as practical.']],
      ['Research guidelines', ['Use only accounts and data you own or have explicit permission to test. Stop if you encounter another person’s data.', 'Do not use social engineering, denial of service, spam, physical attacks, automated destructive testing, or data exfiltration.']],
      ['Our commitment', ['We will investigate in good faith, keep you informed at reasonable intervals, and work toward remediation based on severity.', 'We will not pursue legal action for accidental, good-faith research that follows this policy. Do not publicly disclose before we confirm a fix or agree on timing.']],
    ],
  },
  CommunityGuidelines: {
    title: 'Community Guidelines', icon: 'CG', detail: 'A constructive space for every member',
    intro: 'Deeply Fit is for encouragement, useful knowledge, and honest progress—not pressure or perfection.',
    sections: [
      ['Be supportive', ['Treat people with dignity. Celebrate sustainable effort and respect different bodies, abilities, cultures, goals, and experience levels.', 'Offer personal experience as personal experience, not a guaranteed result or professional diagnosis.']],
      ['Keep it safe', ['Do not post harassment, hate, sexual exploitation, graphic violence, self-harm encouragement, dangerous challenges, or eating-disorder promotion.', 'Protect privacy. Do not share someone else’s personal information, private messages, images, or health data without permission.']],
      ['Keep it authentic', ['Do not spam, manipulate engagement, impersonate others, or promote misleading products, transformations, or health claims.', 'Disclose relevant commercial relationships. Follow content ownership and copyright rules.']],
      ['Moderation', ['Members can report content or block accounts. We may reduce distribution, remove content, restrict features, or suspend accounts.', 'Context and severity matter. Contact Support if you believe a moderation decision should be reviewed.']],
    ],
  },
};

const LegalDocument = ({ route, navigation }) => {
  const document = LEGAL_DOCUMENTS[route.name];
  if (!document) return null;

  return (
    <InfoPageLayout
      navigation={navigation}
      title={document.title}
      eyebrow="Last updated August 21, 2026"
      intro={document.intro}
      footer="Questions? Contact support@deeplyfit.app. This in-app copy is the current product policy summary."
    >
      {document.sections.map(([title, items]) => (
        <InfoSection title={title} key={title}>
          {items.map((item, index) => (
            index === 0 && items.length === 1
              ? <InfoParagraph key={item}>{item}</InfoParagraph>
              : <InfoBullet key={item}>{item}</InfoBullet>
          ))}
        </InfoSection>
      ))}
    </InfoPageLayout>
  );
};

export default LegalDocument;
